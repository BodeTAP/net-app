const normalizeProfile = (profile) => profile || 'default';

const buildNewSecret = ({ clientId, profile, password }) => {
  if (!clientId) {
    throw new Error('ID pelanggan wajib diisi untuk membuat PPPoE Secret.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    throw new Error('Password PPPoE wajib diisi dan minimal 8 karakter.');
  }

  return {
    name: clientId,
    password,
    profile: normalizeProfile(profile),
    service: 'pppoe'
  };
};

const buildProfileUpdate = (profile) => ({
  profile: normalizeProfile(profile)
});

const isSecretActive = (secret) => {
  const disabled = secret.disabled === true || secret.disabled === 'true' || secret.disabled === 'yes';
  const isExpiredProfile = normalizeProfile(secret.profile).toUpperCase() === 'EXPIRED';
  return !disabled && !isExpiredProfile;
};

const buildSyncPreview = (clients, secrets) => {
  const clientsById = new Map(clients.map((client) => [client.id, client]));
  const secretsByName = new Map(secrets.map((secret) => [secret.name, secret]));
  const visibleClients = clients.filter((client) => !client.is_archived);
  const changes = [];
  let matched = 0;
  let unchanged = 0;
  let toImport = 0;
  let toUpdate = 0;

  for (const secret of secrets) {
    const client = clientsById.get(secret.name);
    const routerProfile = normalizeProfile(secret.profile);
    const routerIsActive = isSecretActive(secret);

    if (!client) {
      toImport++;
      changes.push({
        clientId: secret.name,
        fullname: secret.name,
        action: 'IMPORT_FROM_ROUTER',
        routerProfile,
        routerIsActive
      });
      continue;
    }

    matched++;
    const profileChanged = routerProfile.toUpperCase() !== 'EXPIRED'
      && normalizeProfile(client.mikrotik_profile) !== routerProfile;
    const routerProfileChanged = normalizeProfile(client.mikrotik_router_profile) !== routerProfile;
    const statusChanged = client.is_active !== routerIsActive;
    const restoreArchived = Boolean(client.is_archived);

    if (profileChanged || routerProfileChanged || statusChanged || restoreArchived) {
      toUpdate++;
      changes.push({
        clientId: client.id,
        fullname: client.fullname,
        action: restoreArchived ? 'RESTORE_FROM_ARCHIVE' : 'UPDATE_FROM_ROUTER',
        currentProfile: normalizeProfile(client.mikrotik_profile),
        routerProfile,
        currentIsActive: client.is_active,
        routerIsActive
      });
    } else {
      unchanged++;
    }
  }

  const clientsToArchive = visibleClients.filter((client) => !secretsByName.has(client.id));
  for (const client of clientsToArchive) {
    changes.push({
      clientId: client.id,
      fullname: client.fullname,
      action: 'ARCHIVE_MISSING_IN_ROUTER',
      currentProfile: normalizeProfile(client.mikrotik_profile)
    });
  }

  return {
    totalCRM: visibleClients.length,
    totalRouter: secrets.length,
    matched,
    toImport,
    toUpdate,
    toArchive: clientsToArchive.length,
    unchanged,
    changes
  };
};

module.exports = {
  buildNewSecret,
  buildProfileUpdate,
  buildSyncPreview,
  isSecretActive
};
