require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const MdToNotion = require("./mdToNotion.js")
const fs = require("fs")

const folderPath = "./testFolder";
const file = "./testFolder/Design thinking.md"
const page = "3c0c7dd0b754488ca464606d22a03685"
const database = databaseId;

const mdt = new MdToNotion(notion);

mdt.dataBaseSetId(database);
mdt.pageSetIcon("⚡");
mdt.setBacklink("link");
mdt.uploadFolder(folderPath)
