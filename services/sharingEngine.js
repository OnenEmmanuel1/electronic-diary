const pool=require('../db');
async function sharedAppointments(owner,delegate,from,to){
 const [access]=await pool.execute('SELECT permissionLevel FROM delegate_access WHERE ownerUserId=? AND delegateUserId=?',[owner,delegate]);
 if(!access.length)throw Error('Access denied');
 const full=access[0].permissionLevel==='FullDetails';
 const base=full?'a.appointmentId,a.appointmentDate,a.appointmentTime,a.title,a.location,a.notes,c.name AS contactName,c.email AS contactEmail,c.phone AS contactPhone,c.notes AS contactNotes':"a.appointmentDate,a.appointmentTime,'Busy' AS availability";
 const join=full?' LEFT JOIN contacts c ON c.contactId=a.contactId AND c.userId=a.userId':'';
 const [rows]=await pool.execute(`SELECT ${base} FROM appointments a${join} WHERE a.userId=? AND a.appointmentDate BETWEEN ? AND ? ORDER BY a.appointmentDate,a.appointmentTime`,[owner,from,to]);
 return rows;
}
async function grant(owner,email,level){if(!['FreeBusyOnly','FullDetails'].includes(level))throw Error('Invalid permission level');const [[u]]=await pool.execute('SELECT userId FROM users WHERE email=?',[email]);if(!u)throw Error('No registered user found with that email');if(+u.userId===+owner)throw Error('You cannot share your diary with yourself');await pool.execute('INSERT INTO delegate_access(ownerUserId,delegateUserId,permissionLevel) VALUES(?,?,?) ON DUPLICATE KEY UPDATE permissionLevel=VALUES(permissionLevel)',[owner,u.userId,level])}
module.exports={sharedAppointments,grant};
