# MedTrust Go Chaincode

> **STATUS: Target Architecture — Not Yet Deployed**
>
> This Go chaincode is written for Hyperledger Fabric 2.5 and implements the
> correct business logic. It has NOT been deployed to a running Fabric network.
> The live demo uses the Node.js in-memory simulation in `/server/ledger_db.js`.

## What This Would Do (When Deployed)

| Contract | Functions | Maps To |
|---|---|---|
| `PrescriptionContract` | `IssuePrescription`, `GetPrescription`, `GetAllPrescriptions` | `/server/routes/prescription.routes.js` |
| `DrugProvenanceContract` | `RegisterBatch`, `TransferCustody`, `GetBatch`, `IssueDRARecall` | `/server/routes/drug.routes.js` |
| `GatewayContract` | `AtomicDispense`, `PreviewCheck` | `/server/routes/gateway.routes.js` |

## Deployment Prerequisites

See `ARCHITECTURE.md` for the full step-by-step setup guide.

Quick checklist:
- [ ] Go 1.20+ installed in WSL2
- [ ] `fabric-samples/test-network` bootstrapped with Fabric 2.5 binaries
- [ ] Channel `medtrust-channel` created with CouchDB state database
- [ ] `@hyperledger/fabric-gateway` added to `server/package.json`
- [ ] `server/fabric_gateway.js` connection profile wired

## Chaincode Module

```
module: medtrust/chaincode
fabric-contract-api-go: v1.2.1
go: 1.20
```

## Files

| File | Contract | Description |
|---|---|---|
| `main.go` | — | Chaincode entrypoint, registers all three contracts |
| `prescription_layer.go` | `PrescriptionContract` | On-chain prescription hashing, ECDSA cert verification, state management |
| `drug_provenance_layer.go` | `DrugProvenanceContract` | Drug batch genesis, custody chain, DRA recall |
| `gateway_contract.go` | `GatewayContract` | Atomic dual-layer dispense gate |
