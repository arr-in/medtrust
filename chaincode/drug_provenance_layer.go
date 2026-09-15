package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// CustodyTransition records a signed handoff between two supply-chain stakeholders
type CustodyTransition struct {
	TransitionID string `json:"transitionId"`
	SenderID     string `json:"senderId"`
	RecipientID  string `json:"recipientId"`
	Location     string `json:"location"`
	Timestamp    int64  `json:"timestamp"`
	SignatureHex string `json:"signatureHex"`
}

// DrugBatchRecord models the physical drug batch provenance (Module 2)
type DrugBatchRecord struct {
	BatchID              string              `json:"batchId"`
	DrugName             string              `json:"drugName"`
	NDC                  string              `json:"ndc"`
	Dosage               string              `json:"dosage"`
	PlantLocation        string              `json:"plantLocation"`
	ManufacturerID       string              `json:"manufacturerId"`
	MfgTimestamp         int64               `json:"mfgTimestamp"`
	ExpiryTimestamp      int64               `json:"expiryTimestamp"`
	CurrentCustodianID   string              `json:"currentCustodianId"`
	CurrentCustodianRole string              `json:"currentCustodianRole"` // "Manufacturer", "Distributor", "Pharmacy"
	CustodyHistory       []CustodyTransition `json:"custodyHistory"`
	IsRecalled           bool                `json:"isRecalled"`
	RecallReason         string              `json:"recallReason,omitempty"`
	RecallAuthority      string              `json:"recallAuthority,omitempty"`
	IsDispensed          bool                `json:"isDispensed"`
	DispenseTimestamp    int64               `json:"dispenseTimestamp,omitempty"`
	DispensedPharmacyID  string              `json:"dispensedPharmacyId,omitempty"`
}

// DrugProvenanceContract implements Module 2 of the MedTrust architecture
type DrugProvenanceContract struct {
	contractapi.Contract
}

// RegisterBatch creates the genesis provenance record for a newly manufactured physical batch
func (dc *DrugProvenanceContract) RegisterBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	drugName string,
	ndc string,
	dosage string,
	plantLocation string,
	manufacturerID string,
	expiryTimestamp int64,
) error {
	exists, err := dc.BatchExists(ctx, batchID)
	if err != nil {
		return fmt.Errorf("failed to query world state: %v", err)
	}
	if exists {
		return fmt.Errorf("batch %s already registered on ledger", batchID)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	var nowUnix int64 = time.Now().Unix()
	if txTime != nil {
		nowUnix = txTime.GetSeconds()
	}

	genesisHop := CustodyTransition{
		TransitionID: fmt.Sprintf("HOP-GENESIS-%s", batchID),
		SenderID:     "PLANT-GENESIS",
		RecipientID:  manufacturerID,
		Location:     plantLocation,
		Timestamp:    nowUnix,
		SignatureHex: "GENESIS_SIGNED",
	}

	batch := DrugBatchRecord{
		BatchID:              batchID,
		DrugName:             drugName,
		NDC:                  ndc,
		Dosage:               dosage,
		PlantLocation:        plantLocation,
		ManufacturerID:       manufacturerID,
		MfgTimestamp:         nowUnix,
		ExpiryTimestamp:      expiryTimestamp,
		CurrentCustodianID:   manufacturerID,
		CurrentCustodianRole: "Manufacturer",
		CustodyHistory:       []CustodyTransition{genesisHop},
		IsRecalled:           false,
		IsDispensed:          false,
	}

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(fmt.Sprintf("BATCH_%s", batchID), batchJSON)
}

// TransferCustody logs a multi-hop custody transfer (Manufacturer -> Distributor -> Pharmacy)
func (dc *DrugProvenanceContract) TransferCustody(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	senderID string,
	recipientID string,
	recipientRole string,
	location string,
	signatureHex string,
) error {
	batch, err := dc.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	if batch.IsDispensed {
		return fmt.Errorf("batch %s is already dispensed", batchID)
	}
	if batch.IsRecalled {
		return fmt.Errorf("batch %s is under DRA recall (%s), custody transfer prohibited", batchID, batch.RecallReason)
	}
	if batch.CurrentCustodianID != senderID {
		return fmt.Errorf("custody breach: claimed sender %s is not current custodian %s", senderID, batch.CurrentCustodianID)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	var nowUnix int64 = time.Now().Unix()
	if txTime != nil {
		nowUnix = txTime.GetSeconds()
	}

	hop := CustodyTransition{
		TransitionID: fmt.Sprintf("HOP-%d", len(batch.CustodyHistory)+1),
		SenderID:     senderID,
		RecipientID:  recipientID,
		Location:     location,
		Timestamp:    nowUnix,
		SignatureHex: signatureHex,
	}

	batch.CustodyHistory = append(batch.CustodyHistory, hop)
	batch.CurrentCustodianID = recipientID
	batch.CurrentCustodianRole = recipientRole

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(fmt.Sprintf("BATCH_%s", batchID), batchJSON)
}

// RecallBatch allows Drug Regulatory Authority (DRA) to flag a contaminated or blacklisted batch
func (dc *DrugProvenanceContract) RecallBatch(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	reason string,
	authorityID string,
) error {
	batch, err := dc.GetBatch(ctx, batchID)
	if err != nil {
		return err
	}

	batch.IsRecalled = true
	batch.RecallReason = reason
	batch.RecallAuthority = authorityID

	batchJSON, err := json.Marshal(batch)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(fmt.Sprintf("BATCH_%s", batchID), batchJSON)
}

// GetBatch reads drug batch record from the state
func (dc *DrugProvenanceContract) GetBatch(ctx contractapi.TransactionContextInterface, batchID string) (*DrugBatchRecord, error) {
	recordJSON, err := ctx.GetStub().GetState(fmt.Sprintf("BATCH_%s", batchID))
	if err != nil {
		return nil, fmt.Errorf("failed to read world state: %v", err)
	}
	if recordJSON == nil {
		return nil, fmt.Errorf("batch %s does not exist on ledger (Counterfeit / unregistered)", batchID)
	}

	var batch DrugBatchRecord
	if err := json.Unmarshal(recordJSON, &batch); err != nil {
		return nil, err
	}
	return &batch, nil
}

// BatchExists checks if batch exists
func (dc *DrugProvenanceContract) BatchExists(ctx contractapi.TransactionContextInterface, batchID string) (bool, error) {
	recordJSON, err := ctx.GetStub().GetState(fmt.Sprintf("BATCH_%s", batchID))
	if err != nil {
		return false, err
	}
	return recordJSON != nil, nil
}

// VerifyDrugConditions verifies batch validity, custody alignment, and recall status
func (dc *DrugProvenanceContract) VerifyDrugConditions(
	ctx contractapi.TransactionContextInterface,
	batchID string,
	dispensingPharmacyID string,
) (*DrugBatchRecord, error) {
	batch, err := dc.GetBatch(ctx, batchID)
	if err != nil {
		return nil, err
	}

	if batch.IsDispensed {
		return nil, fmt.Errorf("batch %s has already been dispensed", batchID)
	}
	if batch.IsRecalled {
		return nil, fmt.Errorf("batch %s has been RECALLED by %s: %s", batchID, batch.RecallAuthority, batch.RecallReason)
	}

	txTime, _ := ctx.GetStub().GetTxTimestamp()
	var nowUnix int64 = time.Now().Unix()
	if txTime != nil {
		nowUnix = txTime.GetSeconds()
	}

	if nowUnix > batch.ExpiryTimestamp {
		return nil, fmt.Errorf("batch %s expired on %d (current time: %d)", batchID, batch.ExpiryTimestamp, nowUnix)
	}

	// Unbroken Chain-of-Custody Check (G4):
	// The batch MUST be currently in the custodial ownership of the dispensing pharmacy
	if batch.CurrentCustodianID != dispensingPharmacyID {
		return nil, fmt.Errorf("custody breach: batch %s is in custody of '%s', but presented at pharmacy '%s'",
			batchID, batch.CurrentCustodianID, dispensingPharmacyID)
	}

	return batch, nil
}
