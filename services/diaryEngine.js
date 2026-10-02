const pool=require('../db');
const tables={
  contacts:{id:'contactId',fields:['name','email','phone','notes'],required:['name']},
  appointments:{id:'appointmentId',fields:['title','contactId','appointmentDate','appointmentTime','location','notes'],required:['title','appointmentDate','appointmentTime']},
  schedules:{id:'scheduleId',fields:['description','objective','scheduleDate','scheduleTime','notes'],required:['description','scheduleDate']},
  tasks:{id:'taskId',fields:['title','dueDate','isCompleted'],required:['title']}
};
function validDate(value){
  if(!value)return true;
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if(!match)return false;
  const [,year,month,day]=match.map(Number);
  const parsed=new Date(Date.UTC(year,month-1,day));
  return parsed.getUTCFullYear()===year&&parsed.getUTCMonth()===month-1&&parsed.getUTCDate()===day;
}
function validTime(value){return !value||/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(value)}
function checked(value){return value===true||value===1||value==='1'||value==='true'||value==='on'}
async function list(table,userId,filters={}){
  const t=tables[table];
  if(!t)throw Error('Invalid module');
  let sql=`SELECT * FROM ${table} WHERE userId=?`,args=[userId];
  if(table==='appointments'&&filters.from){sql+=' AND appointmentDate>=?';args.push(filters.from)}
  if(table==='appointments'&&filters.to){sql+=' AND appointmentDate<=?';args.push(filters.to)}
  sql+=table==='tasks'?' ORDER BY isCompleted,dueDate':' ORDER BY '+(table==='appointments'?'appointmentDate,appointmentTime':table==='schedules'?'scheduleDate,scheduleTime':'createdAt DESC');
  const [rows]=await pool.execute(sql,args);
  return rows;
}
async function save(table,userId,id,data){
  const t=tables[table];
  if(!t)throw Error('Invalid module');
  for(const field of t.required)if(!String(data[field]||'').trim())throw Error(`${field} is required`);
  if(data.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))throw Error('Enter a valid email');
  if((table==='appointments'&&!validDate(data.appointmentDate))||(table==='schedules'&&!validDate(data.scheduleDate))||(table==='tasks'&&!validDate(data.dueDate)))throw Error('Enter a valid date');
  if((table==='appointments'&&!validTime(data.appointmentTime))||(table==='schedules'&&!validTime(data.scheduleTime)))throw Error('Enter a valid time');
  if(table==='appointments'&&data.contactId){
    const [contacts]=await pool.execute('SELECT contactId FROM contacts WHERE contactId=? AND userId=?',[data.contactId,userId]);
    if(!contacts.length)throw Error('Contact not found');
  }
  const values=t.fields.map(field=>field==='isCompleted'?(checked(data[field])?1:0):(data[field]||null));
  if(id){
    const assignments=t.fields.map(field=>`${field}=?`).join(',');
    const [result]=await pool.execute(`UPDATE ${table} SET ${assignments} WHERE ${t.id}=? AND userId=?`,[...values,id,userId]);
    if(!result.affectedRows)throw Error('Record not found');
    return +id;
  }
  const [result]=await pool.execute(`INSERT INTO ${table}(userId,${t.fields.join(',')}) VALUES(${Array(t.fields.length+1).fill('?').join(',')})`,[userId,...values]);
  return result.insertId;
}
async function remove(table,userId,id){
  const t=tables[table];
  if(!t)throw Error('Invalid module');
  const [result]=await pool.execute(`DELETE FROM ${table} WHERE ${t.id}=? AND userId=?`,[id,userId]);
  if(!result.affectedRows)throw Error('Record not found');
}
module.exports={tables,list,save,remove};
