import express from 'express';
import cors from 'cors';
import path from 'path';

const app = express();
const __dirname = path.resolve();
const mainPath = path.join(__dirname,'src')

app.use(cors());
app.use(express.static(mainPath));

const PORT = 4000;

app.get('/', (req, res) =>{
	res.sendFile(mainPath +`index.html`);
});

app.listen(PORT, ()=>{
	console.log(`Application listening on port ${PORT}!`);
})