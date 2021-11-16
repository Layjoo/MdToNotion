const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "secret_xxxxxxxxxxxxxxxxxxxxxxx"; //change this
const notion = new Client({ auth: INTEGRATION_TOKEN});

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note";
const imgPath = "./Publish note";

mdt.dataBaseSetId("https://www.notion.so/9720c7ae31fdbcfqbe8ctgwaf061badb4?v=13cfd6a9c15g4cafg2bag5e31e9c2d282"); //change this
mdt.pageSetIcon("⚡"); //chage icon 💕💞💙💫
mdt.setBacklink("mention");
mdt.setImgPath(imgPath); //spicify directory that keep all of your image.
mdt.uploadFolder(folderPath);