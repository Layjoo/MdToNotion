const path = require("path")
const {NotionObject, Block} = require("./notionObject");
const fs = require("fs");
// const parserMd = require("./parserMd")

module.exports = class MdToNotion{
  #notion
  
  constructor(notionToken) {
    this.#notion = notionToken;
  }

  //findPage ID with specific tile
  findPage = async(pageTitle) => {
    const response = await this.#notion.search({
        query: pageTitle,
        sort: {
          direction: 'ascending',
          timestamp: 'last_edited_time',
        },
    });
    //Filter to exculde database from page
    const excludeDataBase = response.results.filter(e => e.object == "page")
    if(excludeDataBase.length == 0){
        console.log("No page is found")
        return null;
    }
    else if(excludeDataBase.length==1){
      console.log("Get page success")
      return excludeDataBase[0].id
    }
    else if(excludeDataBase.length > 1){
        //find the repeated page name in the same database
        const listOfSamePageName = [];
        for(let i = 0; i <excludeDataBase.length; i++){
            if(excludeDataBase[i].properties.Name.title[0].plain_text == pageTitle){
                listOfSamePageName.push(excludeDataBase[i])
            }
        }
        if(listOfSamePageName.length > 1){
            console.log(`You have a same page name: ${listOfSamePageName[0].properties.Name.title[0].plain_text}`);
            return null;
        }else if(listOfSamePageName.length == 1){
            console.log("Get page success")
            return listOfSamePageName[0].id
        }
        else{
            console.log("No page is found")
            return null;
        }
    }else{
      return null;
    }
  }

  //this make annotaion and mention happend
  parserToRichTextObj = async(text) => {
      const regex = {
          highlight:/(?<!\|)==[^\|\=\s].+?==(?!\|)/,
          bold: /(?<!\|)\*\*[^(\|\*\s)].+?\*\*(?!\|)/,
          code: /(?<!\|)`[^(\|\`\s)].+?`(?!\|)/,
          strikethrough: /(?<!\|)~.[^\|\s]*?~~(?!\|)/,
          backLink: /(?<!\|)\[\[[^(\|\]\])].+?\]\](?!\|)/
      }

      for(let i in regex){
          while(text.match(regex[i])!==null){
              const index = text.match(regex[i]).index
              const lastSlice = index + text.match(regex[i])[0].length
              const textInside = text.slice(index,lastSlice)
              const newReplce = text.replace(regex[i],"|" + textInside + "|")
              text = newReplce 
          }
      }
      
      //get arrray of each seperate type of regex
      const listOfText = text.split("|");
      //return array of object for each seperate type of annotation and content
      var modifiedText = [];

      for(let i=0; i<listOfText.length; i++){
          if(regex.bold.test(listOfText[i])){
              const content = listOfText[i].replace(/\*/g,"")
              const richTextObj = new NotionObject().richTextObj;
              richTextObj.plain_text = content;
              richTextObj.annotations["bold"] = true;
              richTextObj.text.content = content;
              modifiedText.push(richTextObj);
          }
          else if(regex.code.test(listOfText[i])){
              const content = listOfText[i].replace(/`/g,"")
              const richTextObj = new NotionObject().richTextObj;
              richTextObj.plain_text = content;
              richTextObj.annotations["code"] = true;
              richTextObj.annotations["color"] = "red";
              richTextObj.text.content = content;
              modifiedText.push(richTextObj);
          }
          else if(regex.highlight.test(listOfText[i])){
              const content = listOfText[i].replace(/==/g,"")
              const richTextObj = new NotionObject().richTextObj;
              richTextObj.plain_text = content;
              richTextObj.annotations["code"] = true;
              richTextObj.annotations["color"] = "red";
              richTextObj.text.content = content;
              modifiedText.push(richTextObj);
          }
          else if(regex.strikethrough.test(listOfText[i])){
              const content = listOfText[i].replace(/~~/g,"")
              const richTextObj = new NotionObject().richTextObj;
              richTextObj.plain_text = content;
              richTextObj.annotations["strikethrough"] = true;
              richTextObj.text.content = content;
              modifiedText.push(richTextObj);
          }
          else if(regex.backLink.test(listOfText[i])){
              const content = listOfText[i].replace(/\[\[|\]\]/g,"")
              const mentionObj = new NotionObject().mentionObj;
              console.log("Mentioning...")
              const pageId = await this.findPage(content);
              if(pageId != null){
                  mentionObj.mention.page.id = pageId;
                  modifiedText.push(mentionObj);
              }else{
                  const richTextObj = new NotionObject().richTextObj;
                  richTextObj.plain_text = listOfText[i];
                  richTextObj.text.content = listOfText[i];
                  modifiedText.push(richTextObj);
              }
          }
          else{
              const richTextObj = new NotionObject().richTextObj;
              richTextObj.plain_text = listOfText[i];
              richTextObj.text.content = listOfText[i];
              modifiedText.push(richTextObj);
          }
      }
          return modifiedText;
  }

  //Every line in the page content is represented by notion block object
  parserMdToNotionObj = async(text) => {
      //notion block object style
      var blockObj = [
          //blockObj[0] is empty
      ,
      {
          isChild: false,
          level: 0
      }
      ]

      //check level of child object
      const tabRegex =/\t/g
      if(tabRegex.test(text)){
          const levelOfnestedChild = text.match(tabRegex).length;
          text = text.replace(tabRegex, "");
          blockObj[1].isChild = true;
          blockObj[1].level = levelOfnestedChild;
      }

      //check if text have a ---  this gonnabe a divider 
      const dividerRegex = /^---/
      if(dividerRegex.test(text)){
          blockObj[0] = new Block().divider;
          return blockObj;
      }

      const heading_1 = /^#\s/;
      if(heading_1.test(text)){
          blockObj[0] = new Block().heading_1;
          const content =  text.replace(heading_1, "");
          blockObj[0].heading_1.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      const heading_2 = /^##\s/;
      if(heading_2.test(text)){
          blockObj[0] = new Block().heading_2;
          const content =  text.replace(heading_2, "");
          blockObj[0].heading_2.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      const heading_3 = /^###\s/;
      if(heading_3.test(text)){
          blockObj[0] = new Block().heading_3;
          const content =  text.replace(heading_3, "");
          blockObj[0].heading_3.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      const bulleted_list_item = /^-\s/;
      if(bulleted_list_item.test(text)){
          blockObj[0] = new Block().bulleted_list_item;
          const content =  text.replace(bulleted_list_item, "");
          blockObj[0].bulleted_list_item.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      const numbered_list_item = /^\d\.\s/;
      if(numbered_list_item.test(text)){
          blockObj[0] = new Block().numbered_list_item;
          const content =  text.replace(numbered_list_item, "");
          blockObj[0].numbered_list_item.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      const quote = /^>/;
      if(quote.test(text)){
          blockObj[0] = new Block().callout;
          const content =  text.replace(quote, "");
          blockObj[0].callout.text = await this.parserToRichTextObj(content);
          return blockObj;
      }

      blockObj[0] = new Block().paragraph;
      blockObj[0].paragraph.text = await this.parserToRichTextObj(text); //normal text object
      return blockObj;
  }

  #sameLevelCompress = async(listOfText) =>{
    var compressObj = [];
    var currentLevel;   
    var currentArr = [];
    var notionObj
  
    //check if input is multiple line -> make the same level line in the same array
    if(listOfText.length > 1){
      for(var i=0; i < listOfText.length; i++){
        notionObj = await this.parserMdToNotionObj(listOfText[i]);
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
    }else{ //if input is just one line of text do this instead
      notionObj = await this.parserMdToNotionObj(listOfText[0])
      compressObj.push({notionObj:[notionObj[0]], level: notionObj[1].level})
    }
    return compressObj;
  }

  //this fuction loop througt every level to find the furthest level, then put itself into previous level as child
  //the loop sitll going untill all of the level nested into level 0
  #nestedChildCompress = (compressObj)=>{
    var previous = 0;
    var i = 0;
    
    //loop througth every level and sitll going untill all of the level nested into level 0
    while(true){
        //compare current with previos level.
        //if previos is the furthest level, put it in previous level of it (parent of previous)
        
        if(compressObj[i].level-previous < 0){
            const postion = compressObj[i-2].notionObj.length-1;
            const type = compressObj[i-2].notionObj[postion]["type"];
            //if previous is the same level of its parent, put them together instend of put as child
            if(compressObj[i-1].level !== compressObj[i-2].level){
                compressObj[i-2].notionObj[postion][type]["children"] = compressObj[i-1].notionObj;
                compressObj.splice(i-1,1);
            }else{
                compressObj[i-2].notionObj.push(...compressObj[i-1].notionObj)
                compressObj.splice(i-1,1);
            }
            //set this for start checking again from level 0
            i = 0; 
            previous = 0;
        }else{
            previous = compressObj[i].level
            i++;
        }

        //Check if compress finished or not
        //if sumamation of all level is more thea 0 the loop still going
        var sum = 0;
        for(let x in compressObj){
            sum = sum + compressObj[x]["level"]
        }
        if(sum == 0){
            let finishedCompress = [];
            for(let y in compressObj){
              finishedCompress.push(...compressObj[y].notionObj)
            }
            return finishedCompress;
        }
    }
  }

  #findFurthestLevle = (compressObj)=>{
    var furthest = 0;
    for(let i=0; i < compressObj.length-1; i++){
        if(compressObj[i].level > furthest){
            furthest = compressObj[i].level
        }
    }
    return furthest;
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
    const compressObj = await this.#sameLevelCompress(listOfstring);
    const furthestLevel = this.#findFurthestLevle(compressObj);

    //if furthest levle of child > 2 use this method
    if(furthestLevel > 2){
      //parser markdown and compress to block object
      let previousLevel;
      let arrOfEachLevelId = [];
    
      //upload each block object in different level (the same leval will upload at once, this make upload faster)
      for(let i=0; i<compressObj.length; i++){
        var Level = compressObj[i]["level"];
        if(Level == 0){
        const appendNormalBlock = await this.#notion.blocks.children.append(this.#childObject(pageId, compressObj[i]["notionObj"]));
        arrOfEachLevelId = [pageId];
        previousLevel = 0;
        console.log("Add Normal block Success");
        }
        if(Level - previousLevel == 1){
          const lastChildIdToAppend = await this.#findLastChild(arrOfEachLevelId[Level-1]);
          const appendChildBlock = await this.#notion.blocks.children.append(this.#childObject(lastChildIdToAppend, compressObj[i]["notionObj"]));
          console.log("Add Chlid block Success");
          arrOfEachLevelId.push(lastChildIdToAppend);
          previousLevel = Level;
        }
        if(Level - previousLevel < 0 ){
          const appendNormalBlock = await this.#notion.blocks.children.append(this.#childObject(arrOfEachLevelId[Level], compressObj[i]["notionObj"]));
          console.log("Add Normal block Success");
        }
      } 
    }else{ 
      //if furthest level of child lesser or equal to 2 use this method
      //faster than above because upload the nested child at once
      //notion only support nested 2 level child upload, so if nested child more than 2 -> using above method to upload instead
      const nestedObj = this.#nestedChildCompress(compressObj);
      const appendNormalBlock = await this.#notion.blocks.children.append(this.#childObject(pageId, nestedObj));
      console.log("Add Normal block Success");
    }
  }

  uploadToDatabase = async(filePath, databaseId) =>{
    console.log("Creating page...")
    const page = new NotionObject().pageObj;
    page.parent.database_id = databaseId;
    page.icon.emoji = "🔗";
    page.properties.Name.title[0].text.content = path.basename(filePath, path.extname(filePath));
    const response = await this.#notion.pages.create(page)
    const pageId = response.id
    await this.uploadToPage(filePath, response.id);
    console.log("Create page success.\n")
  }

}