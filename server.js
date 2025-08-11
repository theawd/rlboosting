import express from 'express';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(process.cwd(), 'free-trials.json');

app.use(express.json());
app.use(express.static('./'));

function readList(){
  try{return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))}catch{return[]}
}
function writeList(list){
  fs.writeFileSync(DATA_FILE, JSON.stringify(list,null,2));
}

// Nodemailer transporter (configure env vars)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT||'587',10),
  secure: !!process.env.SMTP_SECURE, // set SMTP_SECURE=1 for true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.post('/api/free-trial', async (req,res)=>{
  const {email, epic, ts} = req.body||{};
  if(!email || !epic) return res.status(400).json({ok:false,error:'missing'});
  const list = readList();
  const emailL = email.toLowerCase();
  const epicL = epic.toLowerCase();
  if(list.find(r => r.email?.toLowerCase()===emailL || r.epic?.toLowerCase()===epicL)){
    return res.status(409).json({ok:false,error:'duplicate'});
  }
  const entry = {email, epic, ts: ts||Date.now()};
  list.push(entry);
  writeList(list);

  // Fire-and-forget email
  const admin = process.env.ADMIN_EMAIL || 'artom.deane@gmail.com';
  transporter.sendMail({
    from: process.env.FROM_EMAIL || admin,
    to: admin,
    subject: 'New Free Trial Signup',
    text: `Email: ${email}\nEpic: ${epic}\nTime: ${new Date(entry.ts).toISOString()}`,
  }).catch(()=>{ /* swallow errors */ });

  res.json({ok:true});
});

app.get('/api/free-trial', (req,res)=>{
  res.json(readList());
});

app.listen(PORT, ()=>console.log('Server on '+PORT));