require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const MdToNotion = require("./mdToNotion")
const fs = require("fs")

const folderPath = "./testFolder";
const page = "08899c6d1c2e4e75bd4d74fec74c548d"

const mdt = new MdToNotion(notion);

const uploadFolder = async(folderPath) =>{
    var files = fs.readdirSync(folderPath);
    for(let i in files){
        const upload = await mdt.uploadToDatabase(folderPath + "/" + files[i],databaseId);
    }
   
}

uploadFolder(folderPath)

// mdt.uploadToPage("./testMd2.txt", page);