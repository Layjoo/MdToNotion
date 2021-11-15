require('dotenv').config();
const MdToNotion = require("./mdToNotion.js")
const fs = require("fs");
const imgur = require('imgur')
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const imgureID = process.env.IMGUR_ID;
const imgurePassword = process.env.IMGUR_PASSWORD;
const imgureClientID = process.env.IMGUR_CLIENT_ID;

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note"
const filePath = "./test.md"
const imgPath = "./Publish note"

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a36bfcf833e?v=df6542d01c5a4d38bd1774be3c4988d2");
mdt.pageSetIcon("⚡");
mdt.setBacklink("mention")
mdt.setImgPath(imgPath)
mdt.loginImgur(imgureID, imgurePassword, imgureClientID);
mdt.uploadToPage(filePath, "https://www.notion.so/test-page-6be6b674036240f684354a4f92c25ca0");
mdt.uploadFolder(folderPath)

