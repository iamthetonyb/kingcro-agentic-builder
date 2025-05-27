
import express from 'express';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Postgres (works out‑of‑the‑box on Railway)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false }
});

app.use(bodyParser.json({limit:'1mb'}));

/* ----------- health ----------- */
app.get('/health',(req,res)=>res.send('OK'));

/* ----------- interview endpoint ----------- */
app.post('/interview', async (req,res)=>{
  // auth (simple Bearer <jwt>)
  const auth = req.headers.authorization||'';
  const token = auth.replace(/^Bearer\s+/,'');
  try { jwt.verify(token, JWT_SECRET); } 
  catch(e){ return res.status(401).json({error:'unauthorized'}); }

  const payload = req.body||{};
  if(!payload.project_name){
     return res.status(400).json({error:'project_name required'}); }

  try{
    // 1. store basic project meta
    const { rows:[project] } = await pool.query(
      `INSERT INTO projects (project_name, raw_request)
       VALUES ($1,$2) RETURNING *`,
       [payload.project_name, payload]
    );

    // 2. Kick n8n workflow
    if(process.env.N8N_WEBHOOK_URL){
      await fetch(process.env.N8N_WEBHOOK_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...payload, project_id: project.id})
      });
    }
    return res.json({stored:true, project_id: project.id});
  }catch(err){
    console.error(err);
    return res.status(500).json({error:'db_error'});
  }
});

app.listen(PORT,()=>console.log('KingCRO Agentic Builder on :'+PORT));
