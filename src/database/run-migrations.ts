import { AppDataSource } from './data-source';

AppDataSource.initialize()
  .then(async (ds) => {
    const migrations = await ds.runMigrations({ transaction: 'all' });
    if (migrations.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Ran ${migrations.length} migration(s):`);
      migrations.forEach((m) => console.log(` - ${m.name}`));
    }
    await ds.destroy();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
