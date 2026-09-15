import crypto from 'node:crypto';

/**
 * MedTrust Cryptographic Engine
 * Complies with Hyperledger Fabric MSP cryptography:
 * - ECDSA (secp256r1 / NIST P-256) for digital signatures
 * - SHA-256 for salted prescription hash (zero PII on-chain, DPDP Act & GDPR compliant)
 */

// Generate ECDSA keypair (secp256r1)
export function generateECDSAKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // standard secp256r1
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });
  return { publicKey, privateKey };
}

// Generate random cryptographic salt
export function generateSalt(bytes = 16) {
  return crypto.randomBytes(bytes).toString('hex');
}

// Compute salted SHA-256 hash for prescription metadata (Zero PII stored on-chain)
export function computePrescriptionHash({ patientId, doctorLicense, drugName, dosage, salt }) {
  const payload = `${patientId.trim()}|${doctorLicense.trim()}|${drugName.trim().toUpperCase()}|${dosage.trim().toLowerCase()}|${salt}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Sign data with ECDSA private key (DER format converted to hex)
export function signECDSA(privateKeyPEM, dataString) {
  const sign = crypto.createSign('SHA256');
  sign.update(dataString);
  sign.end();
  return sign.sign(privateKeyPEM, 'hex');
}

// Verify ECDSA signature against public key PEM
export function verifyECDSA(publicKeyPEM, dataString, signatureHex) {
  try {
    const verify = crypto.createVerify('SHA256');
    verify.update(dataString);
    verify.end();
    return verify.verify(publicKeyPEM, signatureHex, 'hex');
  } catch (err) {
    console.error('ECDSA verification error:', err.message);
    return false;
  }
}

// Calculate generic SHA-256 hash (e.g. for blocks or transit tokens)
export function sha256(data) {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(str).digest('hex');
}
