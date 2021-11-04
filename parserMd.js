const parserToRichTextObj = (text) => {
    var newArr = [];
    const regex = {
        highlight:/==.+?==/g,
        bold: /\*\*.+?\*\*/g,
        code: /`.+?`/g,
    }

    //check and get array of text that matched with regex
    for(i in regex){ 
        if(regex[i].test(text)){
            newArr.push(...text.match(regex[i]))
            newArr = [...new Set(newArr)]
        }
    }

    //replace matched regex with "|"
    for(let i=0; i<newArr.length; i++){
        if(regex.bold.test(newArr[i])){
            text = text.replace(new RegExp(regex.bold),"|" + newArr[i] + "|");
        }
        else{
            text = text.replace(new RegExp(newArr[i],"g"),"|" + newArr[i] + "|");
        }
    }
    
    //get arrray of each seperate type of regex
    const listOfText = text.split("|");

    //notion richtext object style
    const richTextObj = class {
        constructor() {
            this.richTextObj = {
                type: 'text',
                text: { content: 'annnotation', link: null },
                annotations: {
                    italic: false,
                    strikethrough: false,
                    underline: false,
                    color: 'default',
                    code: false,
                    bold: false,
                },
                plain_text: 'annnotation',
                href: null
            }   
        }
    }

    //return array of object for each seperate type of annotation and content
    var makeRichObj = [];
    for(var i=0; i<listOfText.length; i++){
        if(regex.bold.test(listOfText[i])){
            const content = listOfText[i].replace(/\*/g,"")
            const matchRichObj = new richTextObj();
            matchRichObj.richTextObj.plain_text = content;
            matchRichObj.richTextObj.annotations["bold"] = true;
            matchRichObj.richTextObj.text.content = content;
            makeRichObj.push(matchRichObj.richTextObj);
        }
        else if(regex.code.test(listOfText[i])){
            const content = listOfText[i].replace(/`/g,"")
            const matchRichObj = new richTextObj();
            matchRichObj.richTextObj.plain_text = content;
            matchRichObj.richTextObj.annotations["code"] = true;
            matchRichObj.richTextObj.text.content = content;
            makeRichObj.push(matchRichObj.richTextObj);
        }
        else if(regex.highlight.test(listOfText[i])){
            const content = listOfText[i].replace(/==/g,"")
            const matchRichObj = new richTextObj();
            matchRichObj.richTextObj.plain_text = content;
            matchRichObj.richTextObj.annotations["code"] = true;
            matchRichObj.richTextObj.text.content = content;
            makeRichObj.push(matchRichObj.richTextObj);
        }
        else{
            const matchRichObj = new richTextObj();
            matchRichObj.richTextObj.plain_text = listOfText[i];
            matchRichObj.richTextObj.text.content = listOfText[i];
            makeRichObj.push(matchRichObj.richTextObj);
        }
    }

    return makeRichObj;
}

const parserMdToNotionObj = (mytext) => {
    //notion block object style
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

    const heading_1 = /^#\s/;
    if(heading_1.test(mytext)){
        blockObj[0].type = "heading_1";
        const content =  mytext.replace(heading_1, "");
        blockObj[0].paragraph.text = parserToRichTextObj(content);
        blockObj[0]["heading_1"] = blockObj[0].paragraph; // change property name
        delete blockObj[0].paragraph;
        return blockObj;
    }

    const heading_2 = /^##\s/;
    if(heading_2.test(mytext)){
        blockObj[0].type = "heading_2";
        const content =  mytext.replace(heading_2, "");
        blockObj[0].paragraph.text = parserToRichTextObj(content);
        blockObj[0]["heading_2"] = blockObj[0].paragraph; // change property name
        delete blockObj[0].paragraph;
        return blockObj;
    }

    const heading_3 = /^###\s/;
    if(heading_3.test(mytext)){
        blockObj[0].type = "heading_3";
        const content =  mytext.replace(heading_3, "");
        blockObj[0].paragraph.text = parserToRichTextObj(content);
        blockObj[0]["heading_3"] = blockObj[0].paragraph; // change property name
        delete blockObj[0].paragraph;
        return blockObj;
    }

    const bulleted_list_item = /^-\s/;
    if(bulleted_list_item.test(mytext)){
        blockObj[0].type = "bulleted_list_item";
        const content =  mytext.replace(bulleted_list_item, "");
        blockObj[0].paragraph.text = parserToRichTextObj(content);
        blockObj[0]["bulleted_list_item"] = blockObj[0].paragraph; // change property name
        delete blockObj[0].paragraph;
        return blockObj;
    }

    blockObj[0].paragraph.text = parserToRichTextObj(mytext); //normal text object
    return blockObj;
}

module.exports = {
    parserToRichTextObj, parserMdToNotionObj
}

console.log(parserMdToNotionObj("# heading **code** "))