require('dotenv').config();
const { Client } = require("@notionhq/client");
const notion = new Client({ auth: process.env.NOTION_KEY});
const databaseId = process.env.NOTION_DATABASE_ID;
const fs = require("fs");
const { get } = require('http');

const path = "./testMd.txt";
const pageTitle = "ploy";

(async () => {
    const getDataBase = await notion.databases.query({database_id: databaseId});
    var blockId = "";

    //Get specific page ID in Database 
    getDataBase.results.map((page)=>{
        if(page.properties.Name.title[0].plain_text == "pageTitle"){
            console.log("ID of " + page.properties.Name.title[0].plain_text + " is " + page.id);
            blockId = page.id;
            const textArr = getData(path);
            upLoadPageContent(textArr, blockId);
        }
    })
})();

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
      isChild: false
    }
  ]

  for(type in regex){

    //check if text have a \t  this gonnabe a child
    const tabRegex =/^\t+/
    if(tabRegex.test(mytext)){ 
      console.log("THis is a child")
      mytext = mytext.replace(tabRegex, "");
      console.log(mytext);
      blockObj[1].isChild = true;
    }

    //check if text have a ---  this gonnabe a divider 
    const dividerRegex = /---/
    if(dividerRegex.test(mytext)){
      console.log("Match regex: " + mytext.match(dividerRegex))
      blockObj[0].type = "divider";
      delete blockObj[0].paragraph;
      blockObj[0]["divider"] = {}; //divider contain empty obj;
      return blockObj;
    }

    //check if text matched markdow symbow
    if(regex[type].test(mytext)){
      console.log("Match regex: " + mytext.match(regex[type]))
      blockObj[0].type = type;
      blockObj[0].paragraph.text[0].text.content = mytext.replace(regex[type], "");
      blockObj[0][type] = blockObj[0].paragraph; // change paragraph key to correct key in regex
      delete blockObj[0].paragraph;
      
      console.log("Content is : " + blockObj[0][type].text[0].text.content);
      return blockObj;
    }
  }
  blockObj[0].paragraph.text[0].text.content = mytext;
  return blockObj;
}

//return block object for appending to page
const chilidObject = (blockId, ChildObj) =>{
  const obj = {
      block_id: blockId,
      children: [
        ChildObj
      ],
    }
  
  return obj;
}

//upload file to notion
const upLoadPageContent = async(arrOfText, PageId) =>{
  for(i in arrOfText){
    var obj = parserMdToNotionObj(arrOfText[i]);
    if(obj[1]["isChild"] == false){
    const appendNormalBlock = await notion.blocks.children.append(chilidObject(PageId, obj[0]));
    console.log("Add Normal block Success\n");
    }
    else{
      const lastChildIdToAppend = await findLastChild(PageId);
      const appendChildBlock = await notion.blocks.children.append(chilidObject(lastChildIdToAppend, obj[0]));
      console.log("Add Chlid block Success\n");
    }
  }
}

//recursive function to find last child
const findLastChild = async(parentPageId) => {
  var pageId = parentPageId
  const getChildlist = await notion.blocks.children.list({
    block_id: pageId,
    page_size: 50,
  });

  if(getChildlist.results[getChildlist.results.length-1].has_children != true){
    return getChildlist.results[getChildlist.results.length-1].id;
  }

  return findLastChild(getChildlist.results[getChildlist.results.length-1].id);
}
