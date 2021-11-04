require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const fs = require("fs");
const { performance } = require('perf_hooks');
const {parserMdToNotionObj} = require("./parserMd")

const path = "./testMd.txt";
const pageTitle = "ploy";
const path2 = "H:/ไดรฟ์ของฉัน/DriveSyncFiles/Obsidian vault/Source note/202110081400 Lumbar spinal stenosis.md"

main();

async function main() {
  var startTime = performance.now()
  const getDataBase = await notion.databases.query({ database_id: databaseId });
  var blockId = "";

  //Get specific page ID in Database 
  getDataBase.results.map((page) => {
    if (page.properties.Name.title[0].plain_text == pageTitle) {
      console.log("ID of " + page.properties.Name.title[0].plain_text + " is " + page.id);
      blockId = page.id;
    }
  });
  const upload = await upLoadPageContent(path, blockId);
  var endTime = performance.now()
  console.log(`--- ${(endTime - startTime)/1000} seconds`)
}

//return block object for appending to page
const childObject = (blockId, listOfChild) =>{
  const blockObj = {
      block_id: blockId,
      children: listOfChild
    }
  return blockObj;
}

//find last child id in the specific level
const findLastChild = async(parentPageId) => {
  const getChildlist = await notion.blocks.children.list({
    block_id: parentPageId,
    page_size: 50,
  });
  return getChildlist.results[getChildlist.results.length-1].id;
}

const upLoadPageContent = async(path, pageId) =>{
  //get data and turn to array of string for ecach line
  const listOfstring = fs.readFileSync(path,{encoding: 'utf8', flag:'r'}).toString().split("\r\n");
  //parser mark down and compress to block object
  const compressObj = compressBlockObj(listOfstring);
  var previousLevel = 0;
  var arrOfEachLevelId = [];

  //upload each block object in different level (the same leval text will upload at once, this make upload faster)
  for(i in compressObj){
    var Level = compressObj[i]["level"];
    if(Level == 0){
    const appendNormalBlock = await notion.blocks.children.append(childObject(pageId, compressObj[i]["notionObj"]));
    arrOfEachLevelId = [pageId];
    previousLevel = 0;
    console.log("Add Normal block Success\n");
    }
    if(Level - previousLevel == 1){
      const lastChildIdToAppend = await findLastChild(arrOfEachLevelId[Level-1]);
      const appendChildBlock = await notion.blocks.children.append(childObject(lastChildIdToAppend, compressObj[i]["notionObj"]));
      console.log("Add Chlid block Success\n");
      arrOfEachLevelId.push(lastChildIdToAppend);
      previousLevel = Level;
    }
    if(Level - previousLevel < 0 ){
      const appendNormalBlock = await notion.blocks.children.append(childObject(arrOfEachLevelId[Level], compressObj[i]["notionObj"]));
      console.log("Add Normal block Success\n");
    }
  } 
}

//return array of the same level object (this will make upload faster)
const compressBlockObj = (listOfText) =>{
  var compressObj = [];
  var currentLevel;
  var currentArr = [];
  for(var i=0; i < listOfText.length; i++){
    var notionObj = parserMdToNotionObj(listOfText[i]);
    if(i==0){//fist round
      currentLevel = notionObj[1].level;
      currentArr.push(notionObj[0]);
    }
    if(i !== 0){//After fist round
      if(notionObj[1].level == currentLevel){
        currentArr.push(notionObj[0]);
        if(i == listOfText.length-1){ //Push in last round
          compressObj.push({notionObj:currentArr,level:currentLevel});
        }
      }
      if(notionObj[1].level !== currentLevel){
        compressObj.push({notionObj:currentArr,level:currentLevel});
        currentLevel = notionObj[1].level;
        currentArr = [notionObj[0]]
      }
    }
  }
  return compressObj;
}

