require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const MdToNotion = require("./mdToNotion")
const fs = require("fs")

const folderPath = "./testFolder";
const page = "9a84b3231bc44b3abb8e118d9cdf45f9"

const mdt = new MdToNotion(notion);

// fs.readdir(folderPath, (err, files) => {
//   files.forEach(file => {
//     mdt.uploadToDatabase(folderPath + "/" + file,databaseId)
//   });
// });

mdt.uploadToPage("./testMd.txt", page);