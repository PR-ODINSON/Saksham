import mongoose from 'mongoose';
import dns from 'dns';

// Some Windows / corporate / hotspot DNS resolvers refuse SRV queries,
// which makes mongodb+srv:// fail with `querySrv ECONNREFUSED`. Pin the
// resolver to public DNS (Google + Cloudflare) so the connection is not
// at the mercy of the host's network config.
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (_) { /* not fatal */ }

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('✗ MONGODB_URI not set in environment');
    process.exit(1);
  }

  // Brief retry loop — DNS hiccups are common on cellular / VPN / hotspot
  // and a single failure used to crash the backend, leaving the principal
  // dashboard unable to reach the reports the peon already submitted.
  const MAX = 3;
  for (let attempt = 1; attempt <= MAX; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
      });
      console.log(`✓ MongoDB Connected: ${conn.connection.host} (db: ${conn.connection.name})`);
      return;
    } catch (err) {
      console.error(`✗ MongoDB attempt ${attempt}/${MAX} failed: ${err.message}`);
      if (attempt === MAX) process.exit(1);
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

export default connectDB;
