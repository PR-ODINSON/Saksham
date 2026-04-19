import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import School from '../models/school.model.js';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const CSV_PATH = path.join(__dirname, '../../TS-PS3.csv');

async function seedSchools() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB.');

    console.log(`Reading CSV file at: ${CSV_PATH}`);
    if (!fs.existsSync(CSV_PATH)) {
      throw new Error('CSV file not found!');
    }

    const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = fileContent.split('\n').map(l => l.trim()).filter(l => l);

    if (lines.length < 2) {
      throw new Error('CSV is empty or missing data rows.');
    }

    const header = lines[0].split(',');
    
    // Create a map to ensure uniqueness by school_id
    const schoolsMap = new Map();

    const DISTRICT_CENTERS = {
      'Ahmedabad': { lat: 23.0225, lng: 72.5714 },
      'Dahod': { lat: 22.8315, lng: 74.2573 },
      'Kutch': { lat: 23.7337, lng: 69.8597 },
      'Surat': { lat: 21.1702, lng: 72.8311 },
    };

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row.length < header.length) continue;

      const school_id = parseInt(row[0]);
      if (isNaN(school_id)) continue;

      if (!schoolsMap.has(school_id)) {
        const districtName = row[1] || 'Unknown';
        const center = DISTRICT_CENTERS[districtName] || { lat: 23.8, lng: 69.5 };
        // Add random jitter (~40km spread) to the district center
        const lat = center.lat + (Math.random() - 0.5) * 0.4;
        const lng = center.lng + (Math.random() - 0.5) * 0.4;

        schoolsMap.set(school_id, {
          schoolId: school_id,
          name: `Government School ${school_id}`,
          district: districtName,
          block: row[2] || 'Unknown',
          schoolType: row[3] === 'Secondary' ? 'Secondary' : 'Primary',
          isGirlsSchool: row[4] === '1' || row[4] === 'true',
          numStudents: parseInt(row[5]) || 0,
          buildingAge: parseInt(row[6]) || 0,
          materialType: row[7] || 'Mixed',
          weatherZone: row[8] || 'Dry',
          location: { lat, lng }
        });
      }
    }

    const uniqueSchools = Array.from(schoolsMap.values());
    console.log(`Found ${uniqueSchools.length} unique schools to seed.`);

    console.log('Clearing existing schools...');
    await School.deleteMany({});
    
    console.log('Inserting schools...');
    await School.insertMany(uniqueSchools);
    
    console.log('Successfully seeded schools from CSV!');
    
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    console.log('Closing database connection...');
    await mongoose.disconnect();
    process.exit(0);
  }
}

seedSchools();
