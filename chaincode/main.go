package main

import (
	"log"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

func main() {
	gatewayContract := new(GatewayContract)
	gatewayContract.PrescriptionContract = PrescriptionContract{}
	gatewayContract.DrugContract = DrugProvenanceContract{}

	prescriptionContract := new(PrescriptionContract)
	drugContract := new(DrugProvenanceContract)

	cc, err := contractapi.NewChaincode(gatewayContract, prescriptionContract, drugContract)
	if err != nil {
		log.Panicf("Error creating MedTrust chaincode: %v", err)
	}

	if err := cc.Start(); err != nil {
		log.Panicf("Error starting MedTrust chaincode: %v", err)
	}
}
