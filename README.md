# MdToNotion

Upload your markdown file to Notion database or page via [Notion API](https://developers.notion.com/).

>💡 This work base on [Obsidian](https://obsidian.md/) markdown syntax. 
I Recommended use for uploading obsidian markdown note to Notion.

I've been building this because I want to publish my obsidian note and share to my friends, Notion is an alternative way to share your note on a page with URL. [See example on Notion database](https://lucky-venom-d29.notion.site/MdToNotion-f913d06f224a4b90a2a708bc2f1dae5d)

## Version 4.0
Feature
- Upload all markdown files in folder to Notion database
- Upload specific markdown file to Notion page
- Nested block work properly
- Support feature
	- **Back link to another page in database**
	- Heading
	- Checkbox
	- Code block 
	- Table (will convert to Latex table)
	- Iframe
	- URL link
	- Link image
	- Local image upload via [Imgur API](https://apidocs.imgur.com/) (with rate limit)
	- Annotation
		- `inline code`
		- `highlight`
		- **bold** 
		- *italic*
		- strikethrough
[See all feature support on Notion page](https://lucky-venom-d29.notion.site/Obsidian-to-Notion-6be6b674036240f684354a4f92c25ca0)

## How to use
1. Clone or Download file on this respiratory. 
2. Create your Notion integration and get your "Internal integration Token"
3. Share your target Notion database or page with your Integration. (you can follow the step on [Notion integration](https://developers.notion.com/docs/getting-started) )
4. Copy URL of your database or page. (we will use with some method later)

### Example 1 :Upload folder to database 
- Upload all file in specific folder (Absolute path) to Notion database

>🚨 Notice: You need to create table database at fist and share database with your integration before copy the URL.

```javascript
const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "xxxxxxxxxxxxxxxx";//put notion integration token here
const notion = new Client({ auth: INTEGRATION_TOKEN});

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note"

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a34tfcf833e?v=df6542d01c5a4d38bd1774be3c4988d2"); //database URL
mdt.pageSetIcon("⚡"); //you can change page icon, all page will create with this icon.
mdt.uploadFolder(folderPath);
```

## Example 2: Enable backlink
- If you want backlink work on Notion, this give two method to make backlink work

```javascript
const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "xxxxxxxxxxxxxxxx";//put notion integration token here
const notion = new Client({ auth: INTEGRATION_TOKEN});

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note"

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a34tfcf833e?v=df6542d01c5a4d38bd1774be3c4988d2");
mdt.setBacklink("mention") //enable backlink, you can use "mention" or "link" as an argument
mdt.pageSetIcon("⚡"); //you can change page icon, all page will create with this icon.
mdt.uploadFolder(folderPath);
```

- `mdt.setBacklink("mention")` will convert \[\[target page\]\] to Notion mention which point to target page.

<img src="https://i.imgur.com/6dSf7GH.gif" width="600">

- `mdt.setBacklink("link")` will point to target page as the same, but will convert backlink to page URL, and also create backlink property on target page which contain URL link back to current page.

<img src="https://i.imgur.com/X4Zoxca.gif" width="600">

## Example 3: Upload local image
- Normally, if you don't specify path where you keep your image, local image with this syntax \[\[image_file.png\]\] will convert to normal text.
- This method will upload image to Notion via [Imgur API](https://apidocs.imgur.com/).
- Image will upload globally but no one can access them. (Only who have the image URL can access)

```javascript
const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "xxxxxxxxxxxxxxxx";//put notion integration token here
const notion = new Client({ auth: INTEGRATION_TOKEN});

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note";
const imgPath = "./Publish note";

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a36bfcf833e?v=df6542d01c5a4fsebd1774be3c4988d2");
mdt.pageSetIcon("⚡");
mdt.setBacklink("mention");
mdt.setImgPath(imgPath); //spicify directory that keep all of your image.
mdt.uploadFolder(folderPath);
```

- If you want to keep track your uploaded image, you need to login with your Imgur account and pass your Client imgur id, all files will display on your imgur account.
- You need to specify directory that contain all of your image, if image directory is not specify, current upload folder path will be used instead.

```javascript
const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "xxxxxxxxxxxxxxxx";//put notion integration token here
const notion = new Client({ auth: INTEGRATION_TOKEN});

const mdt = new MdToNotion(notion);
const folderPath = "./Publish note";
const imgPath = "./Publish note";
const imgureEmail = "xxxxxx@hotmail.com";
const imgurePassword = "123456xx";
const imgureClientId = "57b7a7e923432xx"

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a36bfcf833e?v=df6542d01c5a4fsebd1774be3c4988d2");
mdt.pageSetIcon("⚡");
mdt.setBacklink("mention");
mdt.setImgPath(imgPath); //spicify directory that keep all of your image.
mdt.loginImgur(imgureEmail, imgurePassword, imgureClientId); //login Imgur API to keep track your uploaded image.
mdt.uploadFolder(folderPath);
```

>🚨 Notice: Limit rate of imgur upload is 50 image/hr and your file must not larger than 2 MB

- If you hit rate limit, image will covert to normal text instead.
- If you still want to upload image, wait for an hour, find the target page that image can't be uploaded in previous, then use upload to specific page method to target page instead. (Example 4)

## Example 4: Upload markdown file to Notion page
- Upload specific file (Absolute path) to Notion page.
- Only content will upload to Notion page (not include title or icon)
- If you upload to page, backlink method will work when you specify Database URL only.
- Image upload also work.

```javascript
const { Client } = require("@notionhq/client");
const MdToNotion = require("./mdToNotion.js")
const INTEGRATION_TOKEN = "xxxxxxxxxxxxxxxx";//put notion integration token here
const notion = new Client({ auth: INTEGRATION_TOKEN});

[const mdt = new MdToNotion(notion);
const filePath = "./test.md";
const imgPath = "./";
const imgureEmail = "xxxxxx@hotmail.com";
const imgurePassword = "123456xx";
const imgureClientId = "57b7a7e923432xx">)

mdt.dataBaseSetId("https://www.notion.so/45ca7bc04ac7458396fc0a36bfcf833e?v=df6542d01c5a4fsebd1774be3c4988d2");
mdt.setBacklink("mention");//if you want this work, you need to set database above.
mdt.setImgPath(imgPath);
mdt.loginImgur(imgureEmail, imgurePassword, imgureClientId);
mdt.uploadToPage(filePath, "https://www.notion.so/test-page-6be6b674036240f684354a4f92a45ca0");
```

## Author Opinion
I'm so sorry if you get error or any issue, this is my first project and i still a beginner for coding.
I would be so very grateful if you leave a comment or give me feedback. 😀🙏
