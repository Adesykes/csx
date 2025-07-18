import 'dotenv/config';
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

if (!process.env.MONGODB_URI || !process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
  console.error('Please add MONGODB_URI, ADMIN_EMAIL, and ADMIN_PASSWORD to your .env file');
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

async function createAdmin() {
  const client = await MongoClient.connect(process.env.MONGODB_URI);
  const db = client.db();

  // Hash the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  try {
    // Check if admin already exists
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      console.error('An user with this email already exists');
      process.exit(1);
    }

    // Create the admin user
    await db.collection('users').insertOne({
      email,
      password: hashedPassword,
      role: 'admin',
      createdAt: new Date()
    });

    console.log('Admin user created successfully!');
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await client.close();
  }
}

createAdmin();
