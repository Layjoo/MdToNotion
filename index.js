require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
// const databaseId = process.env.NOTION_DATABASE_ID;
// const testPage = process.env.NOTIONP_TEST_PAGE;
const MdToNotion = require("./mdToNotion.js")
const fs = require("fs");


const mdt = new MdToNotion(notion);

mdt.dataBaseSetId(database);
mdt.pageSetIcon("⚡");
mdt.uploadToPage(file, page)
mdt.uploadFolder(folder)

