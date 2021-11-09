const path = require("path")
const {NotionObject, Block, Property} = require("./notionObject");
const fs = require("fs");
const { makeConsoleLogger } = require("@notionhq/client/build/src/logging");
const { getPage } = require("@notionhq/client/build/src/api-endpoints");

module.exports = class MdToNotion{
  #notion
  #databaseId;
  #pageIcon;
  #backlinkType;
  #backlinkList;
  
  constructor(notionToken) {
    this.#notion = notionToken;
    this.#pageIcon = "🔗";
    this.#databaseId = null;
    this.#backlinkType = null;
    this.#backlinkList = [];
  }

  //findPage indatabase with specific title, return title and id. 
  //if no page have found return id = null.
  findPage = async(pageTitle) => {
    const response = await this.#notion.databases.query({
      database_id: this.#databaseId,
      filter: {
        or: [
          {
            property: 'Name',
            text: {
              contains: pageTitle
            },
          },
        ],
      },
    });
    
    const arrOfResult = response.results;
    //Get only page that are in current Database only and checking for repeat page.
    const getOnlyPage = arrOfResult.filter(e => e.object == "page");
    const pageInCurentDataBase = getOnlyPage.filter(e => e.parent.database_id.replace(/-/g,"") == this.#databaseId)
    const page = pageInCurentDataBase.filter(e => e.properties.Name.title[0].plain_text == pageTitle)
    if(page.length == 0){
      console.log("No page is found")
      return {title: pageTitle, id: null};
    }
    else if(page.length > 1){
      console.log(`You have a repeat page `)
      return {title: pageTitle, id: null};
    }
    else{
      console.log(`Found "${page[0].properties.Name.title[0].plain_text} in database"`)
      return {title: pageTitle, id: page[0].id};
    }
  }

  //this make annotaion and mention happend.
  parserToRichTextObj = async(text) => {
    const regex = {
      highlight:/(?<!\|)==[^\|\=\s].+?==(?!\|)/,
      bold: /(?<!\|)\*\*[^(\|\*\s)].+?\*\*(?!\|)/,
      code: /(?<!\|)`[^(\|\`\s)].+?`(?!\|)/,
      strikethrough: /(?<!\|)~.[^\|\s]*?~~(?!\|)/,
      backLink: /(?<!\|)\[\[[^(\|\]\])].+?(?<!\.\w\w\w)\]\](?!\|)/ //exclud png jpg and pdf
    }

    //checking the annotation of content, seperate them with |.
    for(let i in regex){
      while(text.match(regex[i])!==null){
        const index = text.match(regex[i]).index
        const lastSlice = index + text.match(regex[i])[0].length
        const textInside = text.slice(index,lastSlice)
        const newReplce = text.replace(regex[i],"|" + textInside + "|")
        text = newReplce 
      }
    }
    
    //split normal text and anotation in to array.
    const listOfText = text.split("|");
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
        if(this.#databaseId !== null && this.#backlinkType !== null){
          console.log("Mentioning...")
          //if text match [[]] -> find the page that match with content inside
          const pageId = await this.findPage(content);
          if(this.#backlinkType == "mention"){
            const mentionObj = new NotionObject().mentionObj;
            if(pageId.id != null){ //turn matched page into mention notion style
              mentionObj.mention.page.id = pageId.id ;
              modifiedText.push(mentionObj);
              console.log(`Mention to ${content} complete`)
            }else{ //if page not found create new one in current database instead
              const addNewPage = await this.createPage(content)
              const newPageId = addNewPage.response.id;
              mentionObj.mention.page.id = newPageId;
              modifiedText.push(mentionObj);
              console.log(`Mention to ${content} complete`)
            }
          }else if(this.#backlinkType == "link"){ //user input, if not then use mention in above
            const richTextObj = new NotionObject().richTextObj;
            richTextObj.plain_text = content;
            richTextObj.text.content = content;
            if(pageId.id != null){ //turn matched page into mention notion style
              richTextObj.text.link = {url: `/${pageId.id.replace(/-/g,"")}`}
              this.#backlinkList.push(pageId.id);
              console.log(richTextObj.href)
              console.log(`Link to ${content} complete`)
            }else{ //if page not found create new one in current database instead
              const addNewPage = await this.createPage(content)
              const newPageId = addNewPage.response.id;
              richTextObj.text.link = {url: `/${newPageId.replace(/-/g,"")}`}
              this.#backlinkList.push(newPageId);
              console.log(`Link to ${content} complete`)
            }
            modifiedText.push(richTextObj);
          }
        }else{//if database id is not specify then put backlink into normal text instead
          const richTextObj = new NotionObject().richTextObj;
          richTextObj.plain_text = content;
          richTextObj.text.content = content;
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

  //paser md to notion block.
  //every line in the page content is represented by notion block object.
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
    const tabRegex =/^\t+/g
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

  //this fuction loop througt every level to find the furthest level, then put itself into previous level as child.
  //the loop sitll going untill all of the level nested into level 0.
  #nestedChildCompress = (compressObj)=>{
    var previous = 0;
    var i = 0;

    //if the file have only level 0 then compress them to one object.
    if(compressObj.length == 1){
      let finishedCompress = [];
        for(let y in compressObj){
          finishedCompress.push(...compressObj[y].notionObj)
        }
        return finishedCompress;
    }else{ 
    //loop througth every level and repeat untill all of the level nested into level 0.
      for(let i = 0; i <compressObj.length;){
        //compare current with previos level.
        //if previos is the furthest level, put it in previous level of it (parent of previous).
        if(compressObj[i].level-previous < 0){
          const postion = compressObj[i-2].notionObj.length-1;
          const type = compressObj[i-2].notionObj[postion]["type"];
          //if previous is the same level of its parent, put them together.
          if(compressObj[i-1].level !== compressObj[i-2].level){
            console.log(compressObj[i-2].notionObj[postion]["type"])
            compressObj[i-2].notionObj[postion][type]["children"] = compressObj[i-1].notionObj;
            compressObj.splice(i-1,1);
          }else{
            compressObj[i-2].notionObj.push(...compressObj[i-1].notionObj)
            compressObj.splice(i-1,1);
          }
          //set this for start checking again from level 0.
          i = 0; 
          previous = 0;
        }else if(i==compressObj.length-1){ 
          //if this is the last round, the loop still repeating and break the code,
          //so we need to stop if this is the last round.
          const postion = compressObj[i-1].notionObj.length-1;
          const type = compressObj[i-1].notionObj[postion]["type"];
          compressObj[i-1].notionObj[postion][type]["children"] = compressObj[i].notionObj;
          compressObj.splice(i,1);
          let finishedCompress = [];
          for(let y in compressObj){
            finishedCompress.push(...compressObj[y].notionObj)
          }
          return finishedCompress;
        }else{
          previous = compressObj[i].level
          i++;
        }

        //Check if compress finished or not
        //if sumamation of all level is more thea 0 the loop still going.
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
    let uploadResponse;

    //if furthest levle of child > 2 use this method
    if(furthestLevel > 2){
      let previousLevel;
      let arrOfEachLevelId = [];
    
      //upload each block object in different level (the same leval will upload at once, this make upload faster)
      for(let i=0; i<compressObj.length; i++){
        var Level = compressObj[i]["level"];
        if(Level == 0){
        uploadResponse = await this.#notion.blocks.children.append(this.#childObject(pageId, compressObj[i]["notionObj"]));
        arrOfEachLevelId = [pageId];
        previousLevel = 0;
        }
        if(Level - previousLevel == 1){
          const lastChildIdToAppend = await this.#findLastChild(arrOfEachLevelId[Level-1]);
          uploadResponse= await this.#notion.blocks.children.append(this.#childObject(lastChildIdToAppend, compressObj[i]["notionObj"]));
          arrOfEachLevelId.push(lastChildIdToAppend);
          previousLevel = Level;
        }
        if(Level - previousLevel < 0 ){
          uploadResponse = await this.#notion.blocks.children.append(this.#childObject(arrOfEachLevelId[Level], compressObj[i]["notionObj"]));
        }
      } 
    }else{ 
      //if furthest level of child lesser or equal to 2 use this method
      //faster than above because upload the nested child at once
      //notion only support nested 2 level child upload, so if nested child more than 2 -> using above method to upload instead
      const nestedObj = this.#nestedChildCompress(compressObj);
      uploadResponse = await this.#notion.blocks.children.append(this.#childObject(pageId, nestedObj));
    }
    console.log("Upload page success\n");
  }

  uploadToDatabase = async(filePath) =>{
    let pageId;
    let pageTitle;
    const fileName = path.basename(filePath, path.extname(filePath))
    console.log(`Current file is ${fileName}`)
    //checking if there are a page that already exit in the database, then upload content to that page instead.
    const findPageId = await this.findPage(fileName);
    pageId = findPageId.id;
    pageTitle = findPageId.title
    if(pageId == null){ //if no page have found, then create new one, and upload the content.
      const createPageResponse = await this.createPage(fileName);
      pageId = createPageResponse.response.id;
      await this.uploadToPage(filePath, pageId);
    }else{
      console.log("You already have this page, upload to this page instead...")
      await this.uploadToPage(filePath, pageId);
    }

    //Checking after upload each file 
    //if there are link to another page in content, then update backlink property for every page that link to this.
    if(this.#backlinkList.length!==0){
      const updateBacklink = await this.#updateBacklink(pageId, pageTitle);
    }
  }

  createPage = async(pageName) => {
    console.log(`Creating page as ${pageName}`)
    const page = new NotionObject().pageObj;
    page.parent.database_id = this.#databaseId;
    page.icon.emoji = this.#pageIcon;
    page.properties.Name.title[0].text.content = pageName;
    const response = await this.#notion.pages.create(page);
    console.log(`Create page ${pageName} success.`);
    return {title: pageName, response: response}
  }

  pageSetIcon = (icon) =>{
    this.#pageIcon = icon
    console.log(`Set icon to ${this.#pageIcon}`)
  }

  setBacklink = (typeOfBacklink) => {
    this.#backlinkType = typeOfBacklink;
    console.log("Chage type of backing to " + this.#backlinkType)
  }

  dataBaseSetId = (id) => {
    this.#databaseId = id;
    console.log(`Set database with ${this.#databaseId}`)
  }
  
  #createDatabaseProperty = async(propertyTitle, propertyType) => {
    console.log("Create Page property")
    const type = {};
    type[propertyType] = [];
    const title = {};
    title[propertyTitle] = type;
    const property = new NotionObject().dataBaseProperty;
    property.database_id = this.#databaseId;
    property.properties = title;
    const response = await this.#notion.databases.update(property);
    return response;
  }

  #updateBacklink = async(currentPageId, pageTitle) => {
    //Variable #backlinkList is assigned from parserToRichText function,
    //if the content have a link to another page then push that link page id to this variable.

    //Loop througt each linked page id and add the backlink property to them.
    for(let i in this.#backlinkList){
      //find backlink property in linked page
      let response = await this.#notion.pages.retrieve({ page_id: this.#backlinkList[i]});
      const isBacklink = response.properties["Backlink"];
      let backLinkContent = [];
      //if linked page dosen't have backlink property then create new one.
      //Notice that page property is also the same as database property,
      //so create backlink property in database of linked page instead.
      if(!isBacklink){
        console.log("Not found Backlink property")
        response = await this.#createDatabaseProperty("Backlink", "rich_text");
      }else{ //get backlink property content
        backLinkContent = response.properties["Backlink"].rich_text;
      }

      //if the content already have some linked page, then add \n, so new content will add in newline.
      if(backLinkContent.length !==0){
        const newLineRichText = new NotionObject().richTextObj;
        newLineRichText.text.content = "\n";
        newLineRichText.plain_text = "\n";
        backLinkContent.push(newLineRichText);
      }
      
      //adding new content of linked page that link to current page.
      const backlinkToPage = new NotionObject().richTextObj;
      backlinkToPage.text.link = {url: `/${currentPageId.replace(/-/g,"")}`};
      backlinkToPage.plain_text = pageTitle;
      backlinkToPage.text.content = pageTitle;
      backLinkContent.push(backlinkToPage);

      //create property object for updating with notion update method
      const updateContent = new Property().rich_text;
      updateContent.rich_text = backLinkContent;
      const title = {};
      title["Backlink"] = updateContent;
      const pageProperty = new NotionObject().pageProperty;
      pageProperty.page_id = this.#backlinkList[i];
      pageProperty.properties = title;
      const updateBacklink = await this.#notion.pages.update(pageProperty);
    }
    this.#backlinkList = []; //Clear array after adding all of the backlink.
  }
  
  uploadFolder = async(folderPath) => {
    if(this.#backlinkType == null){
      fs.readdir(folderPath, (err, files) => {
      files.forEach(file => {
        this.uploadToDatabase(folderPath + "/" + file,this.#databaseId)
      });
    });
    }else{
      var files = fs.readdirSync(folderPath);
      for(let i in files){
          const upload = await this.uploadToDatabase(folderPath + "/" + files[i],this.#databaseId);
      }
    }
  }
}