const express = require('express')
const MicroInvoice = require("microinvoice");
const { QuickDB } = require("quick.db");
const nodemailer = require('nodemailer');
const multer = require("multer");
const path = require('path');
const bodyParser = require('body-parser');
const SFTPClient = require('ssh2-sftp-client');

const app = express();
const db = new QuickDB();
const sftp = new SFTPClient();
const todaydate = new Date().toLocaleDateString();
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.urlencoded({ extended: true }));
let invoicenumber; 

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __dirname); 
    },
    filename: (req, file, cb) => {
        cb(null, 'logo' + path.extname(file.originalname)); 
    },
});
const upload = multer({ storage: storage });

async function fetchData() {
  invoicenumber = await db.get("invnum");
}

async function connectSFTP() {
    if (!sftp.connected) {
        await sftp.connect({
            host: 'dono-03.danbot.host',
            port: 2022,
            username: 'devilking.59aae87b',
            password: '6Y19P94LJI0NUYGJ'
        });
}}

async function deleteFile(filename) {
    try {
        await connectSFTP();
        await sftp.delete(filename);
    } catch (err) {
        console.error('Error deleting file:', err);
}}

async function closeSFTP() {
    try {
        await sftp.end();
    } catch (err) {
        console.error('Error closing SFTP connection:', err);
}}

async function sendInvoice(name, email) {
let transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587, 
  secure: false, 
  auth: {
    user: 'invoicegenerator2024@gmail.com',
    pass: 'ighcacpnxfjtzjzc'
  },
  connectionTimeout: 10000
});

let mailOptions = {
  from: 'invoicegenerator2024@gmail.com',
  to: `${email}`,
  subject: `Invoice #${invoicenumber}`,
  text: `Dear ${name}, \nPlease find Invoice #${invoicenumber} attached in this email.\n\nThanks and Regards,\nInvoice Generator.`,
  attachments: [
    {
      filename: `Invoice #${invoicenumber}.pdf`, 
      path: `./Invoice #${invoicenumber}.pdf` 
    }
  ]
};

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.log('Error sending email:\n', error);
  } else {
    console.log(`Invoice #${invoicenumber} has been emailed.`);
  }
});
}

app.get('/', (req, res) => {
  res.render('index');
})

app.get('/invoice', (req, res) => {
  res.render('invoice');
})

app.get('/about', (req, res) => {
    res.render('about'); 
});

app.post('/submit', upload.single("logo"), async (req, res) => {
    const logopath = req.file ? req.file.filename : '';
    const { name, email, phone, comadd1, comadd2, incomadd3, company, commail, comphone, status, description, price, quantity, total, incomment } = req.body;
    const comadd3 = incomadd3 ? incomadd3 : "";
    const comment = incomment ? incomment : 'Thank you. Please visit again.';
    const filteredParts = description.map((desc, index) => ({
        description: desc,
        price: price[index],
        quantity: quantity[index],
        total: total[index],
    })).filter(item => item.description && item.price && item.quantity && item.total);
    const parts = filteredParts.map(item => [
        { value: item.description },
        { value: parseFloat(item.price) },
        { value: parseInt(item.quantity) },
        { value: parseFloat(item.total), price: true }
    ]);
    const grandTotal = parts.reduce((sum, part) => sum + parseFloat(part[3].value), 0);
await fetchData().then(async () => {
let myInvoice = new MicroInvoice({
  style : {
    header : {
      image : { path : `${logopath}`, width : 100, height : 75
    }}},
  data : {
    invoice : {
      name : "INVOICE",

      header: [ { label: "Invoice Number", value: invoicenumber }, { label: "Status", value: status }, { label: "Date", value: todaydate } ],

      currency : "INR",

      customer : [{
        label : "Bill To",
        value : [ `${name}`, `+91${phone}`, `${email}`]
      }],

      seller : [{
        label : "Bill From",
        value : [ `${company}`, `+91${comphone}`, `${commail}`, `${comadd1}`, `${comadd2}`, `${comadd3}` ]
      }],

      legal : [{
        value  : `${comment}`,
        weight : "bold",
        color  : "primary"
      }],

      details : {
        header: [ { value: "Description" }, { value: "Price" }, { value: "Quantity" }, { value: "Subtotal" } ],
        parts: parts,
        total: [ { label: "Total", value: grandTotal.toFixed(2), price: true } ]
}}}})

myInvoice.generate(`Invoice #${invoicenumber}.pdf`).then(async () => {
  const innum = await db.get("invnum");
  await db.set("invnum", innum+1);
  await sendInvoice(name, email).then(async() => { 
  await res.render('sent', { name, email, phone, company, filteredParts, grandTotal });        
  await deleteFile(`Invoice #${invoicenumber}.pdf`).then(async () => { await closeSFTP(); });                                
  if(req.file) { await deleteFile(`${req.file.filename}`).then(async () => { await closeSFTP(); }); }
})}).catch((error) => {
  console.error(error);
})})
}); 

app.listen(4974)
console.log("Accessible at: http://88.99.210.167:4974 | https://ingen.only-fans.club/")