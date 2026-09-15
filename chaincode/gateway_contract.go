package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// DispenseResult captures the atomic evaluation verdict and audit metadata
type DispenseResult struct {
	Success              bool   `json:"success"`
	TransactionID        string `json:"transactionId"`
	PrescriptionID       string `json:"prescriptionId"`
	BatchID              string `json:"batchId"`
	PharmacyID           string `json:"pharmacyId"`
	Timestamp            int64  `json:"timestamp"`
	PrescriptionVerified bool   `json:"prescriptionVerified"`
	DrugVerified         bool   `json:"drugVerified"`
	Message              string `json:"message"`
	SecurityBreachCode   string `json:"securityBreachCode,omitempty"`
}

// GatewayContract coordinates Module 1 and Module 2 for atomic point-of-sale evaluation
type GatewayContract struct {
	contractapi.Contract
	PrescriptionContract PrescriptionContract
	DrugContract         DrugProvenanceContract
}

// AuthorizeAndDispense performs atomic concurrent evaluation of Module 1 and Module 2
func (gc *GatewayContract) AuthorizeAndDispense(
	ctx contractapi.TransactionContextInterface,
	prescriptionID string,
	batchID string,
	pharmacyID string,
) (*DispenseResult, error) {
	txID := ctx.GetStub().GetTxID()
	txTime, _ := ctx.GetStub().GetTxTimestamp()
	var nowUnix int64 = time.Now().Unix()
	if txTime != nil {
		nowUnix = txTime.GetSeconds()
	}

	result := DispenseResult{
		Success:        false,
		TransactionID:  txID,
		PrescriptionID: prescriptionID,
		BatchID:        batchID,
		PharmacyID:     pharmacyID,
		Timestamp:      nowUnix,
	}

	// 1. Evaluate Module 1 (Prescription Verification)
	rxRecord, rxErr := gc.PrescriptionContract.VerifyPrescriptionConditions(ctx, prescriptionID)
	if rxErr != nil {
		result.PrescriptionVerified = false
		result.Message = fmt.Sprintf("Module 1 Verification Failure: %v", rxErr)
		result.SecurityBreachCode = "PRESCRIPTION_CHECK_FAILED"
		// Emit audit event for DRA query
		_ = emitBreachEvent(ctx, "DISPENSE_REJECTED", result)
		return &result, nil
	}
	result.PrescriptionVerified = true

	// 2. Evaluate Module 2 (Drug Authenticity & Custody)
	batchRecord, batchErr := gc.DrugContract.VerifyDrugConditions(ctx, batchID, pharmacyID)
	if batchErr != nil {
		result.DrugVerified = false
		result.Message = fmt.Sprintf("Module 2 Verification Failure: %v", batchErr)
		result.SecurityBreachCode = "DRUG_CUSTODY_OR_BATCH_FAILED"
		// Emit audit event for DRA query
		_ = emitBreachEvent(ctx, "DISPENSE_REJECTED", result)
		return &result, nil
	}
	result.DrugVerified = true

	// 3. Dual Check Passed - Execute Atomic Commit:
	// Transition Prescription -> Fulfilled
	rxRecord.State = StateFulfilled
	rxRecord.DispensedPharmacyID = pharmacyID
	rxRecord.DispensedBatchID = batchID
	rxRecord.DispensedTimestamp = nowUnix

	rxJSON, err := json.Marshal(rxRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize prescription update: %v", err)
	}
	err = ctx.GetStub().PutState(fmt.Sprintf("RX_%s", prescriptionID), rxJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to commit prescription update: %v", err)
	}

	// Transition Drug Batch -> Dispensed
	batchRecord.IsDispensed = true
	batchRecord.DispenseTimestamp = nowUnix
	batchRecord.DispensedPharmacyID = pharmacyID

	// Add final dispensing hop to custody trail
	finalHop := CustodyTransition{
		TransitionID: fmt.Sprintf("HOP-DISPENSED-%s", batchID),
		SenderID:     pharmacyID,
		RecipientID:  fmt.Sprintf("PATIENT_HASH_%s", rxRecord.SaltedHash[:8]),
		Location:     pharmacyID,
		Timestamp:    nowUnix,
		SignatureHex: "DISPENSE_TOKEN_COMMITTED",
	}
	batchRecord.CustodyHistory = append(batchRecord.CustodyHistory, finalHop)

	batchJSON, err := json.Marshal(batchRecord)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize batch update: %v", err)
	}
	err = ctx.GetStub().PutState(fmt.Sprintf("BATCH_%s", batchID), batchJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to commit batch update: %v", err)
	}

	// 4. Final Success Record
	result.Success = true
	result.Message = "Atomic Dual-Layer Verification Succeeded: Prescription Fulfilled and Batch Dispensed"
	_ = emitBreachEvent(ctx, "DISPENSE_AUTHORIZED", result)

	return &result, nil
}

func emitBreachEvent(ctx contractapi.TransactionContextInterface, eventName string, payload interface{}) error {
	bytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return ctx.GetStub().SetEvent(eventName, bytes)
}
