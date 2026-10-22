import assert from 'assert';
import { prisma } from './src/db.js';

async function runDPDPComplianceChecks() {
  console.log('--- Starting DPDP Compliance Behavioral Verification ---');

  // Test 1: Verify Prisma ConsentLog Creation
  console.log('Test 1: Recording explicit consent in ConsentLog...');
  const testEmail = `dpdp-test-${Date.now()}@example.com`;
  const consentRecord = await prisma.consentLog.create({
    data: {
      userEmail: testEmail,
      purpose: 'TERMS_AND_PRIVACY_NOTICE',
      consentVersion: '1.0',
      status: 'GRANTED',
      details: 'Self-check automated verification under DPDP Act 2023',
      ipAddress: '127.0.0.1',
      userAgent: 'DPDP-Compliance-Runner/1.0',
    },
  });

  assert(consentRecord && consentRecord.id, 'ConsentLog record must have an ID');
  assert.strictEqual(consentRecord.purpose, 'TERMS_AND_PRIVACY_NOTICE');
  assert.strictEqual(consentRecord.status, 'GRANTED');
  assert.strictEqual(consentRecord.consentVersion, '1.0');
  console.log('✅ Test 1 Passed: ConsentLog created with ID:', consentRecord.id);

  // Test 2: Verify Consent Withdrawal under Section 6(4)
  console.log('Test 2: Verifying consent withdrawal recording...');
  const withdrawalRecord = await prisma.consentLog.create({
    data: {
      userEmail: testEmail,
      purpose: 'TERMS_AND_PRIVACY_NOTICE',
      consentVersion: '1.0',
      status: 'WITHDRAWN',
      details: 'User withdrawn consent under DPDP Section 6(4)',
    },
  });

  assert(withdrawalRecord && withdrawalRecord.id, 'Withdrawal log must have an ID');
  assert.strictEqual(withdrawalRecord.status, 'WITHDRAWN');
  console.log('✅ Test 2 Passed: Consent withdrawal recorded with ID:', withdrawalRecord.id);

  // Test 3: Verify DSAR Request Creation under Chapter III
  console.log('Test 3: Creating DSAR request in DSARRequest model...');
  const dsarRecord = await prisma.dSARRequest.create({
    data: {
      fullName: 'Rahul Sharma (Test)',
      email: testEmail,
      requestType: 'ACCESS',
      details: 'Requesting complete personal data export under Section 11',
      status: 'PENDING',
    },
  });

  assert(dsarRecord && dsarRecord.id, 'DSARRequest must have an ID');
  assert.strictEqual(dsarRecord.requestType, 'ACCESS');
  assert.strictEqual(dsarRecord.status, 'PENDING');
  console.log('✅ Test 3 Passed: DSAR request recorded with ID:', dsarRecord.id);

  // Test 4: Verify Nomination under Section 14
  console.log('Test 4: Creating Nomination request under Section 14...');
  const nominationRecord = await prisma.dSARRequest.create({
    data: {
      fullName: 'Priya Patel (Test)',
      email: testEmail,
      requestType: 'NOMINATION',
      details: 'Statutory beneficiary nomination under DPDP Act 2023 Section 14',
      nomineeDetails: JSON.stringify({
        name: 'Arjun Patel',
        email: 'arjun@example.com',
        relation: 'Brother',
      }),
      status: 'PENDING',
    },
  });

  assert(nominationRecord && nominationRecord.id, 'Nomination request must have an ID');
  assert.strictEqual(nominationRecord.requestType, 'NOMINATION');
  const parsedNominee = JSON.parse(nominationRecord.nomineeDetails);
  assert.strictEqual(parsedNominee.name, 'Arjun Patel');
  console.log('✅ Test 4 Passed: Nomination registered with ID:', nominationRecord.id);

  // Clean up test data
  console.log('Cleaning up test records...');
  await prisma.consentLog.deleteMany({ where: { userEmail: testEmail } });
  await prisma.dSARRequest.deleteMany({ where: { email: testEmail } });
  console.log('✅ Clean up complete.');

  console.log('🎉 All DPDP Compliance Self-Checks Passed Successfully!');
}

runDPDPComplianceChecks()
  .catch((err) => {
    console.error('❌ DPDP Compliance Self-Check Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
