const path = require("path")
const {NotionObject, Block, Property} = require("./notionObject");
const fs = require("fs");
const imgur = require("imgur");
const { makeConsoleLogger } = require("@notionhq/client/build/src/logging");

module.exports = class MdToNotion{
  #notion
  #databaseId;
  #pageIcon;
  #backlinkType;
  #backlinkList;
  #imgurEmail;
  #imgurPassword;
  #imgurClientId;
  #imgPath;
  
  constructor(notionToken) {
    this.#notion = notionToken;
    this.#pageIcon = "🔗";
    this.#databaseId = null;
    this.#backlinkType = null;
    this.#backlinkList = [];
    this.#imgurEmail = null;
    this.#imgurPassword = null;
    this.#imgurClientId = null;
    this.#imgPath = ".";
  }

  //findPage indatabase with specific title, return title and id. 
  //if no page have found return id = null.
  #findPage = async (pageTitle) => {
    const response = await this.#notion.databases.query({
      database_id: this.#databaseId,
      filter: {
        or: [{
          property: 'Name',
          text: {
            contains: pageTitle
          },
        }, ],
      },
    });

    const arrOfResult = response.results;
    //Get only page that are in current Database only and checking for repeat page.
    const getOnlyPage = arrOfResult.filter(e => e.object == "page");
    const pageInCurentDataBase = getOnlyPage.filter(e => e.parent.database_id.replace(/-/g, "") == this.#databaseId)
    const page = pageInCurentDataBase.filter(e => e.properties.Name.title[0].plain_text == pageTitle)
    if (page.length == 0) {
      console.log("No page is found")
      return {
        title: pageTitle,
        id: null
      };
    } else if (page.length > 1) {
      console.log(`You have a repeat page `)
      return {
        title: pageTitle,
        id: null
      };
    } else {
      console.log(`Found "${page[0].properties.Name.title[0].plain_text} in database"`)
      return {
        title: pageTitle,
        id: page[0].id
      };
    }
  }

  //this make annotaion and mention happend.
  #parserToRichTextObj = async (text) => {
    const regex = {
      highlight: /(?<!┆)==[^┆\=\s].*?==(?!┆)/,
      bold: /(?<!┆)\*\*[^(┆\*\s)].+?\*\*(?!┆)/,
      code: /(?<!┆)`[^(┆\`\s)].+?`(?!┆)/,
      strikethrough: /(?<!┆)~.[^┆\s]*?~~(?!┆)/,
      italic: /(?<!┆|\*)\*[^(┆\*\s)].+?\*(?!┆|\*)/,
      backLink: /(?<!┆)\[\[[^(┆\]\])].+?(?<!\.\w\w\w)\]\](?!┆)/, //exclud png jpg and pdf
      equation: /(?<!┆)\$[^(┆\`\s)].+?\$(?!┆)/
    }

    //checking the annotation of content, seperate them with ┆.
    for (let i in regex) {
      while (text.match(regex[i]) !== null) {
        const index = text.match(regex[i]).index
        const lastSlice = index + text.match(regex[i])[0].length
        const textInside = text.slice(index, lastSlice)
        const newReplce = text.replace(regex[i], "┆" + textInside + "┆")
        text = newReplce
      }
    }

    //split normal text and anotation in to array.
    const listOfText = text.split("┆");
    let modifiedText = [];

    for (let i = 0; i < listOfText.length; i++) {
      if (regex.bold.test(listOfText[i])) {
        const content = listOfText[i].replace(/\*/g, "")
        const richTextObj = new NotionObject().richTextObj;
        richTextObj.plain_text = content;
        richTextObj.annotations["bold"] = true;
        richTextObj.text.content = content;
        modifiedText.push(richTextObj);

      } else if (regex.code.test(listOfText[i])) {
        const content = listOfText[i].replace(/`/g, "")
        const richTextObj = new NotionObject().richTextObj;
        richTextObj.plain_text = content;
        richTextObj.annotations["code"] = true;
        richTextObj.annotations["color"] = "red";
        richTextObj.text.content = content;
        modifiedText.push(richTextObj);

      } else if (regex.highlight.test(listOfText[i])) {
        const content = listOfText[i].replace(/==/g, "")
        const richTextObj = new NotionObject().richTextObj;
        richTextObj.plain_text = content;
        richTextObj.annotations["code"] = true;
        richTextObj.annotations["color"] = "red";
        richTextObj.text.content = content;
        modifiedText.push(richTextObj);

      } else if (regex.strikethrough.test(listOfText[i])) {
        const content = listOfText[i].replace(/~~/g, "")
        const richTextObj = new NotionObject().richTextObj;
        richTextObj.plain_text = content;
        richTextObj.annotations["strikethrough"] = true;
        richTextObj.text.content = content;
        modifiedText.push(richTextObj);

      } else if (regex.italic.test(listOfText[i])) {
        const content = listOfText[i].replace(/\*/g, "")
        const richTextObj = new NotionObject().richTextObj;
        richTextObj.plain_text = content;
        richTextObj.annotations["italic"] = true;
        richTextObj.text.content = content;
        modifiedText.push(richTextObj);

      } else if (regex.backLink.test(listOfText[i])) {
        let content = listOfText[i].replace(/\[\[|\]\]/g, "")
        let link = content;

        //check if content have | (text after | will be content and before will be link).
        const isModifeid = content.match(/\|/g);
        if (isModifeid !== null && isModifeid.length == 1) {
          content = content.match(/(?<=\|).*/)[0];
          link = link.match(/.*(?=\|)/)[0];
        }
        if (this.#databaseId !== null && this.#backlinkType !== null) {
          console.log("Mentioning...")
          //if text match [[]] -> find the page that match with content inside
          const pageId = await this.#findPage(link);
          if (this.#backlinkType == "mention") { //user input "mention"
            const mentionObj = new NotionObject().mentionObj;
            if (pageId.id != null) { //turn matched page into mention notion style
              mentionObj.mention.page.id = pageId.id;
              modifiedText.push(mentionObj);
              console.log(`Mention to ${link} complete`)
            } else { //if page not found create new one in current database instead
              const addNewPage = await this.createPage(link)
              const newPageId = addNewPage.response.id;
              mentionObj.mention.page.id = newPageId;
              modifiedText.push(mentionObj);
              console.log(`Mention to ${link} complete`)
            }
          } else if (this.#backlinkType == "link") { //user input "link"
            const richTextObj = new NotionObject().richTextObj;
            richTextObj.plain_text = content;
            richTextObj.text.content = content;
            if (pageId.id != null) { //turn matched page into mention notion style
              richTextObj.text.link = {
                url: `/${pageId.id.replace(/-/g,"")}`
              }
              this.#backlinkList.push(pageId.id);
              console.log(`Link to ${link} complete`)
            } else { //if page not found create new one in current database instead
              const addNewPage = await this.createPage(link)
              const newPageId = addNewPage.response.id;
              richTextObj.text.link = {
                url: `/${newPageId.replace(/-/g,"")}`
              }
              this.#backlinkList.push(newPageId);
              console.log(`Link to ${link} complete`)
            }
            modifiedText.push(richTextObj);
          }
        } else {
          //if database id or type of backlink is not specifythen 
          //put backlink into normal text instead
          const richTextObj = new NotionObject().richTextObj;
          richTextObj.plain_text = content;
          richTextObj.text.content = content;
          modifiedText.push(richTextObj);
        }
      } else if (regex.equation.test(listOfText[i])) {
        const content = listOfText[i].replace(/\$/g, "")
        const equation = new NotionObject().equationObj;
        equation.plain_text = content;
        equation.equation.expression = content
        modifiedText.push(equation);
      } else {
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
  #parserMdToNotionObj = async (text) => {
    //notion block object style with level of tab.
    let blockObj = [
      //blockObj[0] is empty now, we will add in next step.
      ,
      {
        isChild: false,
        level: 0
      }
    ]
    //check level of child object
    const tabRegex = /^\t|(?<=\t)\t/g
    if (tabRegex.test(text)) {
      const levelOfnestedChild = text.match(tabRegex).length;
      text = text.replace(tabRegex, "");
      blockObj[1].isChild = true;
      blockObj[1].level = levelOfnestedChild;
    }

    //check if text have a ---  this gonnabe a divider 
    const dividerRegex = /^---/
    if (dividerRegex.test(text)) {
      blockObj[0] = new Block().divider;
      return blockObj;
    }

    //check type of block
    const heading_1 = /^#\s/;
    if (heading_1.test(text)) {
      blockObj[0] = new Block().heading_1;
      const content = text.replace(heading_1, "");
      blockObj[0].heading_1.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const heading_2 = /^##\s/;
    if (heading_2.test(text)) {
      blockObj[0] = new Block().heading_2;
      const content = text.replace(heading_2, "");
      blockObj[0].heading_2.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const heading_3 = /^###\s/;
    if (heading_3.test(text)) {
      blockObj[0] = new Block().heading_3;
      const content = text.replace(heading_3, "");
      blockObj[0].heading_3.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const heading_456 = /^####+\s/;
    if (heading_456.test(text)) {
      const content = text.replace(heading_456, "");
      blockObj[0] = new Block().paragraph;
      const richTextObj = new NotionObject().richTextObj;
      richTextObj.annotations.bold = true;
      richTextObj.plain_text = content;
      richTextObj.text.content = content;
      blockObj[0].paragraph.text = [richTextObj];
      return blockObj;
    }
    const todo = /^-\s\[[x\s]\]\s/;
    if (todo.test(text)) {
      blockObj[0] = new Block().todo;
      const content = text.replace(todo, "");
      blockObj[0].to_do.text = await this.#parserToRichTextObj(content);
      const isChecked = text.match(/(?<=-\s\[).(?=\])/)[0];
      if (isChecked == "x") {
        blockObj[0].to_do.checked = true;
      } else {
        blockObj[0].to_do.checked = false;
      }
      return blockObj;
    }

    const image = /!*\[\[.*?\.(png|jpg|gif)\]\]/;
    if (image.test(text)) {
      const imgFileName = text.match(/(?<=\[\[).*?(?=\]\])/)[0];
      const imgPath = this.#searchImg(this.#imgPath, imgFileName)
      if(imgPath !== null){
        blockObj[0] = new Block().image;
        const imageUrl = await this.#uploadImg(imgPath);
        if(imageUrl){
          blockObj[0].image.external.url = imageUrl;
          return blockObj;
        }
      }
    }

    //(?!\!*\[\[.*\.\w\w\w\]\])
    const bulleted_list_item = /^-\s/; //exclud image in list
    if (bulleted_list_item.test(text)) {
      blockObj[0] = new Block().bulleted_list_item;
      const content = text.replace(bulleted_list_item, "");
      blockObj[0].bulleted_list_item.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const numbered_list_item = /^\d\.\s/; //exclude image in nubered list
    if (numbered_list_item.test(text)) {
      blockObj[0] = new Block().numbered_list_item;
      const content = text.replace(numbered_list_item, "");
      blockObj[0].numbered_list_item.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const quote = /^>/;
    if (quote.test(text)) {
      blockObj[0] = new Block().callout;
      const content = text.replace(quote, "");
      blockObj[0].callout.text = await this.#parserToRichTextObj(content);
      return blockObj;
    }

    const table = /(?<=\|)\s*-+\s*(?=\|)/g
    if (table.test(text)) {
      const splitColumn = text.split(/\r\n|(?<!\r)\n/g);
      //remove |---|
      const removeHyphen = splitColumn.filter(e => e.match(/\|.+\|/) && !e.match(/(?<=\|)\s*-+\s*(?=\|)/g))
      let tableContent = "";
      //add Latex sytax -> textsf{someContent} and merge them together to tabelContent.
      for (let i = 0; i < removeHyphen.length; i++) {
        const modifiedContent = removeHyphen[i].match(/(?<=\|).*?(?=\|)/g)
        let newText = "";
        for (let j = 0; j < modifiedContent.length; j++) {
          let text = `\\textsf{${modifiedContent[j]}}`
          if (i == 0) {
            text = `\\textsf{\\textbf{${modifiedContent[j]}}}`;
          }
          if (j == modifiedContent.length - 1) {
            text = text + " \\\\\\hline\n"
          } else {
            text = text + " & "
          }
          newText = newText + text;
        }
        tableContent = tableContent + newText;
      }

      //count column of table form |---|
      const column = splitColumn.filter(e => e.match(/\|\s*[-\|\s]+\s*\|/g))
      const countColumn = column[0].match(/(?<=\|)\s*-+\s*(?=\|)/g).length;

      let tableColumn = ""
      for (let i = 0; i < countColumn; i++) {
        tableColumn += "|c"
      }
      //Merge header and tabel content together and add to notion Block object
      const addTable = `\\def\\arraystretch{1.4}\\begin{array}{${tableColumn}|}\\hline\n${tableContent}\\end{array}`
      blockObj[0] = new Block().equation;
      blockObj[0].equation.expression = addTable;
      return blockObj;
    }

    const code = /^\!\`\`\`/;
    if (code.test(text)) {
      const notionCode = new NotionObject().NotionCodeLanguage;
      const content = text.replace(/\!\`\`\`.*\n|\n\`\`\`\n*/g, "")
      blockObj[0] = new Block().codeBlock;
      blockObj[0].code.text[0].text.content = content;
      const codeLanguage = text.match(/(?<=\!\`\`\`).*(?=\n)/);
      if (codeLanguage.length !== null) {
        const matchedLanguage = notionCode.filter(e => e == codeLanguage[0]);
        if (matchedLanguage.length !== 0) {
          blockObj[0].code.language = matchedLanguage[0];
        } else {
          blockObj[0].code.language = "plain text"
        }
      }
      return blockObj;
    }

    const blockEquation = /\$\$.*?\$\$/;
    if (blockEquation.test(text)) {
      const content = text.replace(/\$\$/g, "");
      blockObj[0] = new Block().equation;
      blockObj[0].equation.expression = content;
      return blockObj;
    }

    //if doesn't match anything then covert to paragraph block.
    blockObj[0] = new Block().paragraph;
    blockObj[0].paragraph.text = await this.#parserToRichTextObj(text);
    return blockObj;
  }

  #sameLevelCompress = async (listOfText) => {
    let compressObj = [];
    let currentLevel;
    let currentArr = [];
    let notionObj

    //check if input is multiple line -> make the same level line in the same array
    if (listOfText.length > 1) {
      for (let i = 0; i < listOfText.length; i++) {
        notionObj = await this.#parserMdToNotionObj(listOfText[i]);
        if (i == 0) { //fist round
          currentLevel = notionObj[1].level;
          currentArr.push(notionObj[0]);
        }
        if (i !== 0) { //After fist round
          if (notionObj[1].level == currentLevel) {
            currentArr.push(notionObj[0]);
            if (i == listOfText.length - 1) { //Push in last round
              compressObj.push({
                notionObj: currentArr,
                level: currentLevel
              });
            }
          }
          if (notionObj[1].level !== currentLevel) {
            compressObj.push({
              notionObj: currentArr,
              level: currentLevel
            });
            currentLevel = notionObj[1].level;
            currentArr = [notionObj[0]]
          }
        }
      }
    } else { //if input is just one line of text do this instead
      notionObj = await this.#parserMdToNotionObj(listOfText[0])
      compressObj.push({
        notionObj: [notionObj[0]],
        level: notionObj[1].level
      })
    }
    return compressObj;
  }

  //this fuction loop througt every level to find the furthest level, then put itself into previous level as child.
  //the loop sitll going untill all of the level nested into level 0.
  #nestedChildCompress = (compressObj) => {
    let previous = 0;
    let i = 0;

    //if the file have only level 0 then compress them to one object.
    if (compressObj.length == 1) {
      let finishedCompress = [];
      for (let y in compressObj) {
        finishedCompress.push(...compressObj[y].notionObj)
      }
      return finishedCompress;

    } else {
      //loop througth every level and repeat untill all of the level nested into level 0.
      for (let i = 0; i < compressObj.length;) {

        //compare current with previos level.
        if (compressObj[i].level - previous < 0) {
          const postion = compressObj[i - 2].notionObj.length - 1;
          const type = compressObj[i - 2].notionObj[postion]["type"];

          //check target block can have child or can not, before append as child
          const noChild = ["equation", "heading_1", "heading_2",
          "heading_3", "callout", "quote", "divider", "image", "code"];
          const isNoChild = noChild.filter(e =>  e == type);
          
          //if previos is the furthest level and it can have child, put it in previous level of it (parent of previous).
          if (compressObj[i - 1].level !== compressObj[i - 2].level && isNoChild.length == 0) {
            compressObj[i - 2].notionObj[postion][type]["children"] = compressObj[i - 1].notionObj;
            compressObj.splice(i - 1, 1);
          } else { //if previous is the same level of its parent or the parent can't have child, put them together.
            compressObj[i - 2].notionObj.push(...compressObj[i - 1].notionObj)
            compressObj.splice(i - 1, 1);
          }
          //set this for start checking again from level 0.
          i = 0;
          previous = 0;
        } else if (i == compressObj.length - 1) {
          //if this is the last round, the loop still repeating and break the code,
          //so we need to stop if this is the last round.
          const postion = compressObj[i - 1].notionObj.length - 1;
          const type = compressObj[i - 1].notionObj[postion]["type"];
          compressObj[i - 1].notionObj[postion][type]["children"] = compressObj[i].notionObj;
          compressObj.splice(i, 1);
          let finishedCompress = [];
          for (let y in compressObj) {
            finishedCompress.push(...compressObj[y].notionObj)
          }
          return finishedCompress;
        } else {
          previous = compressObj[i].level
          i++;
        }

        //Check if compress finished or not
        //if sumamation of all level is more thea 0 the loop still going.
        let sum = 0;
        for (let x in compressObj) {
          sum = sum + compressObj[x]["level"]
        }
        if (sum == 0) {
          let finishedCompress = [];
          for (let y in compressObj) {
            finishedCompress.push(...compressObj[y].notionObj)
          }
          return finishedCompress;
        }
      }
    }
  }

  #findFurthestLevle = (compressObj) => {
    let furthest = 0;
    for (let i = 0; i < compressObj.length - 1; i++) {
      if (compressObj[i].level > furthest) {
        furthest = compressObj[i].level
      }
    }
    return furthest;
  }

  //return block object for appending to page
  #childObject = (blockId, listOfChild) => {
    const blockObj = {
      block_id: blockId,
      children: listOfChild
    }
    return blockObj;
  }

  //find last child id in the specific level
  #findLastChild = async (parentPageId) => {
    const getChildlist = await this.#notion.blocks.children.list({
      block_id: parentPageId,
      page_size: 50,
    });
    const lastChildId = getChildlist.results[getChildlist.results.length - 1].id;
    const lastChildType = getChildlist.results[getChildlist.results.length - 1].type;
    return {id: lastChildId, type: lastChildType};
  }

  //set new aligment of inline code block
  #modifiedInlineCodeBlock = (listOfString) => {
    let indexOfCode = [];
    let i = 0;
    for (i; i < listOfString.length; i++) {
      const codeRegex = /^\`\`\`/;
      if (codeRegex.test(listOfString[i])) {
        indexOfCode.push(i)
      }

      if (indexOfCode.length == 2) {
        const fistIndex = indexOfCode[0];
        const lastIndex = indexOfCode[1];
        const codeSplit = listOfString.splice(fistIndex, lastIndex - fistIndex + 1);

        let mergeSplit = codeSplit.reduce((pre, now) => pre + "\n" + now)
        mergeSplit = "!" + mergeSplit
        listOfString.splice(fistIndex, 0, mergeSplit);

        i = 0;
        indexOfCode = [];
      }
    }
    return listOfString;
  }

  //set new aligment of inline img
  #modifiedInlineImg = (listOfString) =>{
    const regex = {
      image: /(?<!┆)\t*-*\s{1}!*\[\[[^┆]*?\.(png|gif|jpg)\]\](?!┆)/,
    }

    for(let j = 0; j<listOfString.length;j++){
      for (let i in regex) {
        while (listOfString[j].match(regex[i]) !== null) {
          const index = listOfString[j].match(regex[i]).index
          const lastSlice = index + listOfString[j].match(regex[i])[0].length
          const textInside = listOfString[j].slice(index, lastSlice)
          const newReplce = listOfString[j].replace(regex[i], "┆" + textInside + "┆")
          listOfString[j] = newReplce
        }
        if(/┆/.test(listOfString[j])){
          const seperated = listOfString[j].split(/┆/);
          listOfString.splice(j,1)
          listOfString.splice(j,0,...seperated);
          j+=seperated.length;
        }
      }
    }
    return listOfString;
  }

  #getText = (filePath) =>{
    let listOfString = fs.readFileSync(filePath, {
      encoding: 'utf8',
      flag: 'r'
    })
    .toString()
    //new line, tabel, equation were included
    .split(/(?<!\|)\r\n|\n(?!\|)|\s(?=\$\$)|(?<=\$\$)\s/g);

    listOfString = this.#modifiedInlineCodeBlock(listOfString); //set new aligment of inline code block
    listOfString = this.#modifiedInlineImg(listOfString); //set new aligment of inline img
    listOfString = listOfString.filter(e => e !== "" && !/^\n|^\s+(?!.[^\s]*)/g.test(e)) //remove blank line
    return listOfString;
  }

  uploadToPage = async (filePath, pageId) => {
    //get text --> spilt text --> return to array of split string
    const listOfString = this.#getText(filePath)
    if(listOfString.length == 0){
      return console.log("Content is empty")
    }
    const compressObj = await this.#sameLevelCompress(listOfString);
    const furthestLevel = this.#findFurthestLevle(compressObj);
    let uploadResponse;

    //if furthest levle of child > 2 use this method
    if (furthestLevel > 2) {
      let previousLevel;
      let arrOfEachLevelId = [];

      //upload each block object in different level (the same leval will upload at once, this make upload faster)
      for (let i = 0; i < compressObj.length; i++) {
        let Level = compressObj[i]["level"];
        if (Level == 0) {
          uploadResponse = await this.#notion.blocks.children.append(this.#childObject(pageId, compressObj[i]["notionObj"]));
          arrOfEachLevelId = [pageId];
          previousLevel = 0;
        }else if (Level - previousLevel == 1) {
          const lastChildIdToAppend = await this.#findLastChild(arrOfEachLevelId[Level - 1]);
          const lastChildId = lastChildIdToAppend.id;

          //check target block can have child or can not, before append as child
          const noChild = ["equation", "heading_1", "heading_2",
          "heading_3", "callout", "quote", "divider", "image", "code"];
          const isNoChild = noChild.filter(e =>  e == lastChildIdToAppend.type);

          if(isNoChild.length == 0){
            uploadResponse = await this.#notion.blocks.children.append(this.#childObject(lastChildId, compressObj[i]["notionObj"]));
            arrOfEachLevelId.push(lastChildId);
            previousLevel = Level;
          }else{ //if target block can not have chile, append to previous parent.
            uploadResponse = await this.#notion.blocks.children.append(this.#childObject(arrOfEachLevelId[previousLevel], compressObj[i]["notionObj"]));
          }
        }else if (Level - previousLevel < 0) {
          uploadResponse = await this.#notion.blocks.children.append(this.#childObject(arrOfEachLevelId[Level], compressObj[i]["notionObj"]));
        }
      }
    } else {
      //if furthest level of child lesser or equal to 2 use this method
      //faster than above because upload the nested child at once
      //notion only support nested 2 level child upload, so if nested child more than 2 -> using above method to upload instead
      const nestedObj = this.#nestedChildCompress(compressObj);
      uploadResponse = await this.#notion.blocks.children.append(this.#childObject(pageId, nestedObj));
    }
    //Checking after upload each file 
    //if there are link to another page in content, then update backlink property for every page that link to this.
    if (this.#backlinkList.length !== 0 && this.#databaseId != null) {
      const pageTitle = path.basename(filePath, path.extname(filePath));
      const updateBacklink = await this.#updateBacklink(pageId, pageTitle);
    }
    return console.log("Upload page success\n");
  }

  uploadToDatabase = async (filePath) => {
    let pageId;
    let pageTitle;
    const fileName = path.basename(filePath, path.extname(filePath))
    console.log(`Current file is ${fileName}`)
    //checking if there are a page that already exit in the database, then upload content to that page instead.
    const findPageId = await this.#findPage(fileName);
    pageId = findPageId.id;
    pageTitle = findPageId.title
    if (pageId == null) { //if no page have found, then create new one, and upload the content.
      const createPageResponse = await this.createPage(fileName);
      pageId = createPageResponse.response.id;
      await this.uploadToPage(filePath, pageId);
    } else {
      console.log("You already have this page, upload to this page instead...")
      await this.uploadToPage(filePath, pageId);
    }
  }

  createPage = async (pageName) => {
    console.log(`Creating page as ${pageName}`)
    const page = new NotionObject().pageObj;
    page.parent.database_id = this.#databaseId;
    page.icon.emoji = this.#pageIcon;
    page.properties.Name.title[0].text.content = pageName;
    const response = await this.#notion.pages.create(page);
    console.log(`Create page ${pageName} success.`);
    return {
      title: pageName,
      response: response
    }
  }

  pageSetIcon = (icon) => {
    this.#pageIcon = icon
    console.log(`🔑 Set page icon with ${this.#pageIcon}`)
  }

  setBacklink = (typeOfBacklink) => {
    this.#backlinkType = typeOfBacklink;
    console.log("🔑 Set type of backing with " + this.#backlinkType)
  }

  dataBaseSetId = (id) => {
    this.#databaseId = id;
    console.log(`🔑 Set database id with ${this.#databaseId}`)
  }

  setImgPath = (imagePath) => {
    this.#imgPath = imagePath;
    console.log(`🔑 Set image path with ${this.#imgPath}`)
  }

  #createDatabaseProperty = async (propertyTitle, propertyType) => {
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

  #updateBacklink = async (currentPageId, pageTitle) => {
    //Variable #backlinkList is assigned from parserToRichText function,
    //if the content have a link to another page then push that link page id to this variable.

    //Loop througt each linked page id and add the backlink property to them.
    for (let i in this.#backlinkList) {
      //find backlink property in linked page
      let response = await this.#notion.pages.retrieve({
        page_id: this.#backlinkList[i]
      });
      const isBacklink = response.properties["Backlink"];
      let backLinkContent = [];
      //if linked page dosen't have backlink property then create new one.
      //Notice that page property is also the same as database property,
      //so create backlink property in database of linked page instead.
      if (!isBacklink) {
        console.log("Not found Backlink property")
        response = await this.#createDatabaseProperty("Backlink", "rich_text");
      } else { //get backlink property content
        backLinkContent = response.properties["Backlink"].rich_text;
      }

      //if the content already have some linked page, then add \n, so new content will add in newline.
      if (backLinkContent.length !== 0) {
        const newLineRichText = new NotionObject().richTextObj;
        newLineRichText.text.content = "\n";
        newLineRichText.plain_text = "\n";
        backLinkContent.push(newLineRichText);
      }

      //adding new content of linked page that link to current page.
      const backlinkToPage = new NotionObject().richTextObj;
      backlinkToPage.text.link = {
        url: `/${currentPageId.replace(/-/g,"")}`
      };
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

  uploadFolder = async (folderPath) => {
    if (this.#backlinkType == null) {
      fs.readdir(folderPath, (err, files) => {
        files.forEach(file => {
          if (fs.lstatSync(path.resolve(folderPath, file)).isFile()){
          this.uploadToDatabase(folderPath + "/" + file, this.#databaseId)
          }
        });
      });
    } else {
      let files = fs.readdirSync(folderPath);
      for (let i in files) {
        if (fs.lstatSync(path.resolve(folderPath, files[i])).isFile()){
          const upload = await this.uploadToDatabase(folderPath + "/" + files[i], this.#databaseId);
        }
      }
    }
  }

  //upload image via imgur api and get url for uploaded image
  #uploadImg = async(filePath) => {
   const stats =  fs.statSync(filePath);
   if(stats.size/(1024*1024) < 1){
     try{
       if(this.#imgurClientId !== null){
         imgur.setCredentials(this.#imgurEmail, this.#imgurPassword, this.#imgurClientId);
       }
       const uploadImg = await imgur.uploadFile(filePath)
       return uploadImg.link;
     }
     catch(error){
       if(error.message.match(/(?<=Response\scode\s)\w\w\w/)[0] == "417"){
         console.log("❗Can not upload large file.")
       }else if(error.message.match(/(?<=Response\scode\s)\w\w\w/)[0] == "429"){
         console.log("❗Too many upload image. wait for minute and try again")
       }
       return null;
     }
   }else{
     console.log("❗Cannote upload large image");
     return null;
   }
  }

  #searchImg = (imgFolderPath, imgFileName) => {
    const path = imgFolderPath;
    const myfile = imgFileName
    let imgPath = "";

    let files = fs.readdirSync(path);
    for (let i in files) {
      if(files[i] == myfile){
        console.log(`Found image : ${myfile}`);
        imgPath = path + "/" + files[i]
        return imgPath;
      }
    }
    console.log(`Not found image : ${myfile}`)
    return null;
  }

  loginImgur = (email, password, clientId) =>{
    this.#imgurEmail = email;
    this.#imgurPassword = password;
    this.#imgurClientId = clientId
  }
}