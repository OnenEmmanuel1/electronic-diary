require('dotenv').config();
const mysql=require('mysql2/promise');
const bcrypt=require('bcrypt');
const fs=require('fs');
const path=require('path');

async function main(){
  const {DB_HOST,DB_USER,DB_NAME}=process.env;
  const DB_PORT=Number(process.env.DB_PORT||3306);
  const DB_PASSWORD=process.env.DB_PASSWORD||'';
  if(!DB_HOST||!DB_USER||!DB_NAME)throw new Error('Set DB_HOST, DB_USER, and DB_NAME in .env');
  if(!/^[A-Za-z0-9_]+$/.test(DB_NAME))throw new Error('DB_NAME may contain only letters, numbers, and underscores');

  const bootstrap=await mysql.createConnection({host:DB_HOST,port:DB_PORT,user:DB_USER,password:DB_PASSWORD});
  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await bootstrap.end();

  const pool=require('../db');
  const schema=fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8');
  for(const statement of schema.split(';').map(part=>part.trim()).filter(Boolean))await pool.query(statement);

  const hash=await bcrypt.hash('password123',10);
  for(const [fullName,email] of [['Alex Morgan','alex@ediary.test'],['Sam Taylor','sam@ediary.test']]){
    await pool.execute('INSERT INTO users(fullName,email,passwordHash) VALUES(?,?,?) ON DUPLICATE KEY UPDATE fullName=VALUES(fullName),passwordHash=VALUES(passwordHash)',[fullName,email,hash]);
  }
  const [[alex]]=await pool.execute('SELECT userId FROM users WHERE email=?',['alex@ediary.test']);
  const [[sam]]=await pool.execute('SELECT userId FROM users WHERE email=?',['sam@ediary.test']);
  const [[existingContact]]=await pool.execute('SELECT contactId FROM contacts WHERE userId=? AND name=?',[alex.userId,'Jordan Lee']);
  let contactId=existingContact?.contactId;
  if(!contactId){const [result]=await pool.execute('INSERT INTO contacts(userId,name,email,phone,notes) VALUES(?,?,?,?,?)',[alex.userId,'Jordan Lee','jordan@example.com','555-0101','Project collaborator']);contactId=result.insertId}
  const [[existingAppointment]]=await pool.execute('SELECT appointmentId FROM appointments WHERE userId=? AND title=?',[alex.userId,'Planning meeting']);
  let appointmentId=existingAppointment?.appointmentId;
  if(!appointmentId){const [result]=await pool.execute("INSERT INTO appointments(userId,title,contactId,appointmentDate,appointmentTime,location,notes) VALUES(?,?,?,DATE_ADD(CURDATE(),INTERVAL 2 DAY),'10:00:00','Meeting room','Review the project plan')",[alex.userId,'Planning meeting',contactId]);appointmentId=result.insertId}
  const [[schedule]]=await pool.execute('SELECT scheduleId FROM schedules WHERE userId=? AND description=?',[alex.userId,'Weekly planning']);
  if(!schedule)await pool.execute("INSERT INTO schedules(userId,description,objective,scheduleDate,scheduleTime,notes) VALUES(?,'Weekly planning','Set priorities',CURDATE(),'09:00:00','Review open items')",[alex.userId]);
  const [[task]]=await pool.execute('SELECT taskId FROM tasks WHERE userId=? AND title=?',[alex.userId,'Prepare agenda']);
  if(!task)await pool.execute("INSERT INTO tasks(userId,title,dueDate) VALUES(?,'Prepare agenda',DATE_ADD(CURDATE(),INTERVAL 1 DAY))",[alex.userId]);
  await pool.execute("INSERT INTO delegate_access(ownerUserId,delegateUserId,permissionLevel) VALUES(?,?,'FreeBusyOnly') ON DUPLICATE KEY UPDATE permissionLevel='FreeBusyOnly'",[alex.userId,sam.userId]);
  const [[invitation]]=await pool.execute('SELECT invitationId FROM meeting_invitations WHERE appointmentId=? AND inviteeUserId=? AND status=\'Pending\'',[appointmentId,sam.userId]);
  if(!invitation)await pool.execute("INSERT INTO meeting_invitations(appointmentId,inviterUserId,inviteeUserId,inviteeEmail,status,token) VALUES(?,?,?,?,'Pending',?)",[appointmentId,alex.userId,sam.userId,'sam@ediary.test','seed-pending-invitation-token-000000000000000000000000']);
  await pool.end();
  console.log('Database initialized and demo data ready.');
}
main().catch(error=>{console.error(error);process.exit(1)});
