class NotionObject {
  pageObj = {
    parent: {
      database_id: null,
    },
    icon: {
      type: "emoji",
      emoji: "🔗"
    },
    cover: null,
    properties: {
      Name: {
        title: [{
          text: {
            content: "",
          },
        }, ],
      },
    },
  }

  updatePageObj = {
    page_id: null,
    properties: null,
  }

  blockObj = {
    object: 'block',
    type: 'paragraph',
    paragraph: {
      text: [{
        type: 'text',
        text: {
          content: "",
        },
      }, ],
    },
  }

  richTextObj = {
    type: 'text',
    text: {
      content: 'annnotation',
      link: null
    },
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

  equationObj = {
    type: 'equation',
    equation: {
      expression: null
    },
    annotations: {
      bold: false,
      italic: false,
      strikethrough: false,
      underline: false,
      code: false,
      color: 'default'
    },
    plain_text: null,
    href: null
  }

  mentionObj = {
    type: 'mention',
    mention: {
      type: 'page',
      page: {
        id: null
      }
    },
  }

  pageProperty = {
    page_id: null,
    properties: null
  }

  dataBaseProperty = {
    database_id: null,
    properties: null
  }

  NotionCodeLanguage = ["abap", "arduino", "bash", "basic", "c", "clojure",
    "coffeescript", "c++", "c#", "css", "dart", "diff", "docker", "elixir", "elm",
    "erlang", "flow", "fortran", "f#", "gherkin", "glsl", "go", "graphql", "groovy",
    "haskell", "html", "java", "javascript", "json", "julia", "kotlin", "latex",
    "less", "lisp", "livescript", "lua", "makefile", "markdown", "markup", "matlab",
    "mermaid", "nix", "objective-c", "ocaml", "pascal", "perl", "php", "plain text",
    "powershell", "prolog", "protobuf", "python", "r", "reason", "ruby", "rust", "sass",
    "scala", "scheme", "scss", "shell", "sql", "swift", "typescript", "vb.net", "verilog",
    "vhdl", "visual basic", "webassembly", "xml", "yaml", "java/c/c++/c#"
  ]
}

class Block {
  paragraph = {
    type: "paragraph",
    paragraph: {
      text: [],
      // "children":[]
    }
  }

  heading_1 = {
    type: "heading_1",
    heading_1: {
      text: []
    }
  }

  heading_2 = {
    type: "heading_2",
    heading_2: {
      text: []
    }
  }

  heading_3 = {
    type: "heading_3",
    heading_3: {
      text: []
    }
  }

  bulleted_list_item = {
    type: "bulleted_list_item",
    bulleted_list_item: {
      text: [{
        type: "text",
        text: {
          content: "Lacinato kale",
          link: null
        }
      }],
      // "children":[]
    }
  }

  numbered_list_item = {
    type: "numbered_list_item",
    numbered_list_item: {
      text: [{
        type: "text",
        text: {
          content: "Lacinato kale",
          link: null
        }
      }],
      // "children":[]
    }
  }

  callout = {
    type: "callout",
    callout: {
      text: null,
    }
  }

  quote = {
    object: 'block',
    type: "quote",
    quote: {
      text: null,
    }
  }

  divider = {
    type: "divider",
    divider: {}
  }

  equation = {
    type: 'equation',
    equation: {
      expression: null,
    },
  }

  todo = {
    type: "to_do",
    to_do: {
      text: null,
      checked: null,
    }
    // "children":[]
  }

  image = {
    type: "image",
    image: {
      type: "external",
      external: {
        url: null
      }
    }
  }

  embed = {
    type: "embed",
    embed: {
      url: null
    }
  }


  codeBlock = {
    type: "code",
    code: {
      text: [{
        type: "text",
        text: {
          content: "",
        }
      }],
      language: "plain text"
    }
  }
}

class Property {

  rich_text = {
    rich_text: null, //array of rich_text object
  }

}

module.exports = {
  NotionObject,
  Block,
  Property
}