import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const __dirname = path.resolve();

app.use(cors());
app.use(express.static(path.join(__dirname,'src')));

const PORT = 4000;

app.get('/', (req, res) =>{
	res.sendFile(`index.html`);
});

app.listen(PORT, ()=>{
	console.log(`Application listening on port ${PORT}!`);
})