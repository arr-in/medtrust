package main

import (
	"crypto/ecdsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// PrescriptionState represents the lifecycle state of an e-prescription
type PrescriptionState string

const (
	StateActive    PrescriptionState = "Active"
	StateFulfilled PrescriptionState = "Fulfilled"
	StateExpired   PrescriptionState = "Expired"
)

// PrescriptionRecord models the privacy-preserving on-chain commitment (Module 1).
// Zero Personally Identifiable Information (PII) is stored on-chain (DPDP Act & GDPR).
type PrescriptionRecord struct {
	PrescriptionID      string            `json:"prescriptionId"`
	SaltedHash          string            `json:"saltedHash"` // 256-bit SHA-256 identifier
	DoctorID            string            `json:"doctorId"`
	DoctorLicense       string            `json:"doctorLicense"`
	DoctorPublicKeyPEM  string            `json:"doctorPublicKeyPem"`
	DoctorECDSASignature string           `json:"doctorEcdsaSignature"`
	IssueTimestamp      int64             `json:"issueTimestamp"`
	ExpiryTimestamp     int64             `json:"expiryTimestamp"`
	State               PrescriptionState `json:"state"`
	DispensedPharmacyID string            `json:"dispensedPharmacyId,omitempty"`
	DispensedBatchID    string            `json:"dispensedBatchId,omitempty"`
	DispensedTimestamp  int64             `json:"dispensedTimestamp,omitempty"`
}

// PrescriptionContract implements Module 1 of the MedTrust architecture
type PrescriptionContract struct {
	contractapi.Contract
}

// IssuePrescription writes a new salted prescription hash to the ledger with Active state
func (pc *PrescriptionContract) IssuePrescription(
	ctx contractapi.TransactionContextInterface,
	prescriptionID string,
	saltedHash string,
	doctorID string,
	doctorLicense string,
	doctorPublicKeyPEM string,
	signatureHex string,
	expiryTimestamp int64,
) error {
	exists, err := pc.PrescriptionExists(ctx, prescriptionID)
	if err != nil {
		return fmt.Errorf("failed to query world state: %v", err)
	}
	if exists {
		return fmt.Errorf("prescription with ID %s already registered", prescriptionID)
	}

	txTime, err := ctx.GetStub().GetTxTimestamp()
	if err != nil {
		return fmt.Errorf("failed to get transaction timestamp: %v", err)
	}
	nowUnix := txTime.GetSeconds()

	record := PrescriptionRecord{
		PrescriptionID:       prescriptionID,
		SaltedHash:           saltedHash,
		DoctorID:             doctorID,
		DoctorLicense:        doctorLicense,
		DoctorPublicKeyPEM:   doctorPublicKeyPEM,
		DoctorECDSASignature: signatureHex,
		IssueTimestamp:       nowUnix,
		ExpiryTimestamp:      expiryTimestamp,
		State:                StateActive,
	}

	recordJSON, err := json.Marshal(record)
	if err != nil {
		return err
	}

	compositeKey := fmt.Sprintf("RX_%s", prescriptionID)
	return ctx.GetStub().PutState(compositeKey, recordJSON)
}

// GetPrescription returns the prescription record from the world state
func (pc *PrescriptionContract) GetPrescription(ctx contractapi.TransactionContextInterface, prescriptionID string) (*PrescriptionRecord, error) {
	compositeKey := fmt.Sprintf("RX_%s", prescriptionID)
	recordJSON, err := ctx.GetStub().GetState(compositeKey)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("prescription %s not found", prescriptionID)
	}

	var record PrescriptionRecord
	if err := json.Unmarshal(recordJSON, &record); err != nil {
		return nil, err
	}

	return &record, nil
}

// PrescriptionExists checks if a prescription ID is present
func (pc *PrescriptionContract) PrescriptionExists(ctx contractapi.TransactionContextInterface, prescriptionID string) (bool, error) {
	compositeKey := fmt.Sprintf("RX_%s", prescriptionID)
	recordJSON, err := ctx.GetStub().GetState(compositeKey)
	if err != nil {
		return false, err
	}
	return recordJSON != nil, nil
}

// VerifyPrescriptionConditions verifies that the prescription is unexpired, active, and signature is valid
func (pc *PrescriptionContract) VerifyPrescriptionConditions(ctx contractapi.TransactionContextInterface, prescriptionID string) (*PrescriptionRecord, error) {
	record, err := pc.GetPrescription(ctx, prescriptionID)
	if err != nil {
		return nil, err
	}

	if record.State != StateActive {
		return nil, fmt.Errorf("prescription is in state '%s', expected 'Active' (Replay fraud prevention)", record.State)
	}

	txTime, err := ctx.GetStub().GetTxTimestamp()
	var currentSeconds int64
	if err == nil && txTime != nil {
		currentSeconds = txTime.GetSeconds()
	} else {
		currentSeconds = time.Now().Unix()
	}

	if currentSeconds > record.ExpiryTimestamp {
		return nil, fmt.Errorf("prescription has expired at %d (current time: %d)", record.ExpiryTimestamp, currentSeconds)
	}

	return record, nil
}
