const crypto=require('crypto');
const pool=require('../db');
const {deliver}=require('./reminderEngine');
async function create(owner,appointmentId,email){
 const [[appointment]]=await pool.execute('SELECT a.*,u.fullName inviter FROM appointments a JOIN users u ON u.userId=a.userId WHERE a.appointmentId=? AND a.userId=?',[appointmentId,owner]);
 if(!appointment)throw Error('Appointment not found');
 if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))throw Error('Enter a valid invitee email');
 email=email.trim().toLowerCase();
 const [[invitee]]=await pool.execute('SELECT userId FROM users WHERE email=?',[email]);
 const token=crypto.randomBytes(32).toString('hex');
 await pool.execute('INSERT INTO meeting_invitations(appointmentId,inviterUserId,inviteeUserId,inviteeEmail,token) VALUES(?,?,?,?,?)',[appointmentId,owner,invitee?.userId||null,email,token]);
 const url=`${process.env.APP_URL||'http://localhost:3000'}/invitations/${token}`;
 const body=`${appointment.inviter} invited you to ${appointment.title} on ${appointment.appointmentDate} at ${appointment.appointmentTime}.\nAccept: ${url}?action=accept\nDecline: ${url}?action=decline`;
 await deliver(email,'E-Diary meeting invitation',body);
 return token;
}
async function respond(token,action){
 if(!['accept','decline'].includes(action))throw Error('Invalid response');
 const conn=await pool.getConnection();
 try{
  await conn.beginTransaction();
  const [[invitation]]=await conn.execute("SELECT i.*,a.title,a.appointmentDate,a.appointmentTime,a.location,a.notes FROM meeting_invitations i JOIN appointments a ON a.appointmentId=i.appointmentId WHERE i.token=? FOR UPDATE",[token]);
  if(!invitation)throw Error('Invitation not found');
  if(invitation.status!=='Pending')throw Error('Invitation already answered');
  const status=action==='accept'?'Accepted':'Declined';
  await conn.execute('UPDATE meeting_invitations SET status=?,respondedAt=NOW() WHERE invitationId=?',[status,invitation.invitationId]);
  if(action==='accept'&&invitation.inviteeUserId){
   await conn.execute('INSERT INTO appointments(userId,title,appointmentDate,appointmentTime,location,notes) VALUES(?,?,?,?,?,?)',[invitation.inviteeUserId,invitation.title,invitation.appointmentDate,invitation.appointmentTime,invitation.location,invitation.notes]);
   await conn.execute('INSERT INTO notifications(userId,message,link) VALUES(?,?,?)',[invitation.inviteeUserId,`Meeting accepted: ${invitation.title}`,'/appointments']);
  }
  await conn.commit();
  return status;
 }catch(error){await conn.rollback();throw error}
 finally{conn.release()}
}
module.exports={create,respond};
