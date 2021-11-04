const path = require("path")
const notionObj = require("./notionObject");
const fs = require("fs");
const parserMd = require("./parserMd")

module.exports = class MdToNotion{
  #notion
  
  constructor(notionToken) {
    this.#notion = notionToken;
  }

  //return array of the same level object (this will make upload faster)
  #compressBlockObj = (listOfText) =>{
    var compressObj = [];
    var currentLevel;   
    var currentArr = [];
    for(var i=0; i < listOfText.length; i++){
      var notionObj = new parserMd().parserMdToNotionObj(listOfText[i]);
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

  //return block object for appending to page
  #childObject = (blockId, listOfChild) =>{
    const blockObj = {
        block_id: blockId,
        children: listOfChild
      }
    return blockObj;
  }
    
  //find last child id in the specific level
  #findLastChild = async(parentPageId) =>{
    const getChildlist = await this.#notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 50,
    });
    return getChildlist.results[getChildlist.results.length-1].id;
  }
  
  uploadToPage = async(filePath, pageId) =>{
    //get text --> spilt text --> return to array of split string
    const listOfstring = fs.readFileSync(filePath,{encoding: 'utf8', flag:'r'}).toString().split("\r\n");
    //parser mark down and compress to block object
    const compressObj = this.#compressBlockObj(listOfstring);
    var previousLevel;
    var arrOfEachLevelId = [];
  
    //upload each block object in different level (the same leval text will upload at once, this make upload faster)
    for(let i=0; i<compressObj.length; i++){
      var Level = compressObj[i]["level"];
      if(Level == 0){
      const appendNormalBlock = await this.#notion.blocks.children.append(this.#childObject(pageId, compressObj[i]["notionObj"]));
      arrOfEachLevelId = [pageId];
      previousLevel = 0;
      console.log("Add Normal block Success\n");
      }
      if(Level - previousLevel == 1){
        const lastChildIdToAppend = await this.#findLastChild(arrOfEachLevelId[Level-1]);
        const appendChildBlock = await this.#notion.blocks.children.append(this.#childObject(lastChildIdToAppend, compressObj[i]["notionObj"]));
        console.log("Add Chlid block Success\n");
        arrOfEachLevelId.push(lastChildIdToAppend);
        previousLevel = Level;
      }
      if(Level - previousLevel < 0 ){
        const appendNormalBlock = await this.#notion.blocks.children.append(this.#childObject(arrOfEachLevelId[Level], compressObj[i]["notionObj"]));
        console.log("Add Normal block Success\n");
      }
    } 
  }

  uploadToDatabase = async(filePath, databaseId) =>{
    const page = new notionObj().pageObj;
    page.parent.database_id = databaseId;
    page.icon.emoji = "🔗";
    page.properties.Name.title[0].text.content = path.basename(filePath, path.extname(filePath));
    const response = await this.#notion.pages.create(page)
    const pageId = response.id
    await this.uploadToPage(filePath, response.id);
    console.log("Create page success.")
  }
}