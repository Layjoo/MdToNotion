require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const fs = require("fs");
const { get } = require('http');

const path = "./testMd.txt";
const pageTitle = "ploy";

//get data from path and return to array of each line
const getData = (path) => {
    return fs.readFileSync(path,{encoding: 'utf8', flag:'r'}).toString().split("\r\n");
}

const parserMdToNotionObj = (mytext) => {
  const regex = {
    "heading_1" : /^#\s/,
    "heading_2" : /^##\s/,
    "bulleted_list_item" : /^-\s/,
    "paragraph" : /^\r/
  }

  var blockObj = [
    {
      object: 'block',
      type: 'paragraph',
      paragraph: {
        text: [
          {
            type: 'text',
            text: {
              content: "",
            },
          },
        ],
      },
    },
    {
      isChild: false,
      level: 0
    }
  ]

  for(type in regex){

    //check level of child object
    const tabRegex =/\t/g
    if(tabRegex.test(mytext)){
      const levelOfnestedChild = mytext.match(tabRegex).length;
      mytext = mytext.replace(tabRegex, "");
      blockObj[1].isChild = true;
      blockObj[1].level = levelOfnestedChild;
    }

    //check if text have a ---  this gonnabe a divider 
    const dividerRegex = /---/
    if(dividerRegex.test(mytext)){
      delete blockObj[0].paragraph;
      blockObj[0].type = "divider";
      blockObj[0]["divider"] = {}; //divider contain empty obj;
      return blockObj;
    }

    //check if text matched markdow symbow
    if(regex[type].test(mytext)){
      blockObj[0].type = type;
      blockObj[0].paragraph.text[0].text.content = mytext.replace(regex[type], "");
      blockObj[0][type] = blockObj[0].paragraph; // change paragraph key to correct key in regex
      delete blockObj[0].paragraph;
      console.log("Content is : " + blockObj[0][type].text[0].text.content + "\n");
      return blockObj;
    }
  }
  blockObj[0].paragraph.text[0].text.content = mytext;
  return blockObj;
}

//return block object for appending to page
const childObject = (blockId, listOfChild) =>{
  const blockObj = {
      block_id: blockId,
      children: listOfChild
    }
  return blockObj;
}

//upload file to notion
const upLoadPageContent = async(compressList, PageId) =>{
  for(i in compressList){
    if(compressList[i]["level"] == 0){
    const appendNormalBlock = await notion.blocks.children.append(childObject(PageId, compressList[i]["notionObj"]));
    console.log("Add Normal block Success\n");
    }
    else{
      const lastChildIdToAppend = await findLastChild(PageId, compressList[i].level);
      const appendChildBlock = await notion.blocks.children.append(childObject(lastChildIdToAppend, compressList[i]["notionObj"]));
      console.log("Add Chlid block Success\n");
    }
  }
}

//find last child id in the specific level
const findLastChild = async(parentPageId, level) => {
  var pageId = parentPageId;
  for(var i=0; i < level;i++){
    const getChildlist = await notion.blocks.children.list({
      block_id: pageId,
      page_size: 50,
    });
    var pageId = getChildlist.results[getChildlist.results.length-1].id;
  }
  return pageId;
}

//return array of each list object with level
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

(async () => {
    const getDataBase = await notion.databases.query({database_id: databaseId});
    var blockId = "";

    //Get specific page ID in Database 
    getDataBase.results.map((page)=>{
        if(page.properties.Name.title[0].plain_text == pageTitle){
            console.log("ID of " + page.properties.Name.title[0].plain_text + " is " + page.id);
            blockId = page.id;
            const textArr = getData(path);
            const compressList = compressBlockObj(textArr);
            upLoadPageContent(compressList, blockId);
        }
    })
})();