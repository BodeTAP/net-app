const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildNewSecret,
  buildProfileUpdate,
  buildSyncPreview,
  isSecretActive
} = require('../src/services/mikrotik/secretPolicy');

test('profile update never contains a password', () => {
  const payload = buildProfileUpdate('PAKET-20M');

  assert.deepEqual(payload, { profile: 'PAKET-20M' });
  assert.equal(Object.hasOwn(payload, 'password'), false);
});

test('new secret requires an explicit password', () => {
  assert.throws(
    () => buildNewSecret({ clientId: 'CL-1', profile: 'default' }),
    /Password PPPoE wajib diisi/
  );

  assert.deepEqual(
    buildNewSecret({ clientId: 'CL-1', profile: 'PAKET-20M', password: 'aman-1234' }),
    {
      name: 'CL-1',
      password: 'aman-1234',
      profile: 'PAKET-20M',
      service: 'pppoe'
    }
  );
});

test('sync preview reports differences without returning sensitive data', () => {
  const preview = buildSyncPreview(
    [
      { id: 'CL-1', fullname: 'Satu', mikrotik_profile: 'PAKET-20M', mikrotik_router_profile: 'PAKET-20M', is_active: true, is_archived: false },
      { id: 'CL-2', fullname: 'Dua', mikrotik_profile: 'PAKET-50M', mikrotik_router_profile: 'PAKET-50M', is_active: true, is_archived: false },
      { id: 'CL-3', fullname: 'Tiga', mikrotik_profile: 'PAKET-10M', mikrotik_router_profile: 'PAKET-10M', is_active: true, is_archived: false },
      { id: 'CL-4', fullname: 'Empat', mikrotik_profile: 'PAKET-20M', mikrotik_router_profile: 'PAKET-20M', is_active: false, is_archived: true }
    ],
    [
      { name: 'CL-1', profile: 'PAKET-20M', disabled: 'false', password: 'jangan-bocor' },
      { name: 'CL-2', profile: 'PAKET-10M', disabled: 'false', password: 'jangan-bocor' },
      { name: 'CL-4', profile: 'EXPIRED', disabled: 'false', password: 'jangan-bocor' },
      { name: 'CL-5', profile: 'PAKET-30M', disabled: 'false', password: 'jangan-bocor' }
    ]
  );

  assert.equal(preview.totalCRM, 3);
  assert.equal(preview.totalRouter, 4);
  assert.equal(preview.matched, 3);
  assert.equal(preview.toImport, 1);
  assert.equal(preview.toUpdate, 2);
  assert.equal(preview.toArchive, 1);
  assert.equal(preview.unchanged, 1);
  assert.equal(JSON.stringify(preview).includes('jangan-bocor'), false);
});

test('RouterOS disabled and EXPIRED secrets are inactive in CRM', () => {
  assert.equal(isSecretActive({ profile: 'PAKET-20M', disabled: 'false' }), true);
  assert.equal(isSecretActive({ profile: 'PAKET-20M', disabled: 'true' }), false);
  assert.equal(isSecretActive({ profile: 'EXPIRED', disabled: 'false' }), false);
});
