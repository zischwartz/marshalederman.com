const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv").config();
const request = require("request");
const render = require("es6-template-render");

const index_template = fs.readFileSync(
  path.resolve(__dirname, "src/index.html"),
  "utf8"
);
// const page_template = fs.readFileSync(
//   path.resolve(__dirname, "src/page.html"),
//   "utf8"
// );

// let items_sheet_url =
//   "https://sheets.googleapis.com/v4/spreadsheets/SPREADSHEET_ID/WORKSHEET_TAB_NAME?key=YOUR_API_KEY";

let items_sheet_url = `https://sheets.googleapis.com/v4/spreadsheets/12V1CZtjXPIio2Ar3-5Vd0DpGnjxYe2jL1jHgc1Zpk_o/values/items?key=${
  process.env.GOOGLE_API_KEY
}`;

let content_sheet_url = `https://sheets.googleapis.com/v4/spreadsheets/12V1CZtjXPIio2Ar3-5Vd0DpGnjxYe2jL1jHgc1Zpk_o/values/content?key=${
  process.env.GOOGLE_API_KEY
}`;

function get_item_data_and_run() {
  request(items_sheet_url, function(error, response, body) {
    // console.log("error:", error); // Print the error if one occurred
    // console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
    // console.log("body:", body); // Print the HTML for the Google homepage.
    let body_obj = JSON.parse(body);
    // console.log(body_obj);
    let items = create_item_objects_from_raw(body_obj.values);
    // console.log(items);
    create_site(items);
  });
}

//  get the content one and then run the above, which in turn runs create_site
request(content_sheet_url, function(error, response, body) {
  let body_obj = JSON.parse(body);
  if (!body_obj.values) {
    console.log(body_obj);
    return;
  }
  let rows = body_obj.values;
  rows.shift();
  let home_page_text = rows.shift();
  let every_page_text = rows.shift();
  // console.log(rows);
  for (row of rows) {
    let title = "Marsha Lederman -" + row[0];
    let content = row[1]
      .split("|")
      .map(a => `<p>${a}</p>`)
      .join("");
    content = `<div class="info_page">${content}</div>`;
    // console.log(content);
    let path = `dist/${slugify(row[0])}`;
    fs.mkdirSync(path);
    fs.writeFileSync(
      `${path}/index.html`,
      render(index_template, { content, title })
    );
  }
  // fs.writeFileSync(
  //   `dist/about.html`,
  //   render(index_template, { content: "blarg", title: title + " About" })
  // );
  get_item_data_and_run();
});

function create_item_objects_from_raw(values) {
  let result = [];
  let headings = values.shift();
  for (row of values) {
    let item = {};
    for (var i = 0; i < headings.length; i++) {
      let v = row[i];
      if (v !== undefined) {
        item[headings[i]] = v;
      }
    }
    // only if it has a title field do we add it
    if (item["title"]) {
      item["slug"] = slugify(item.title);
      // stick the original row back in
      item["row"] = row;
      result.push(item);
    }

    // console.log(row);
  }
  return result;
}

function create_site(items) {
  let title = "Marsha Lederman";
  // doh, right it can't do arrays
  let index_items_content = create_index_items_content(items);
  fs.writeFileSync(
    `dist/index.html`,
    render(index_template, { content: index_items_content, title })
  );

  // now make a page for each item
  items.forEach(item => create_item_page(item));
}

function create_item_page(item) {
  function make_img(p) {
    // this only works for offline xxx
    let src =
      process.env.NODE_ENV != "production"
        ? `../../images/${p}` // it's up one when just loadin git in dev, because it's in dist
        : `../images/${p}`;
    return `<img class="full" src="${src}"/>`;
  }

  let title = `${item.title}`;
  // let image_paths = item.row.slice(4);
  let image_paths = item.row.slice(5);
  // console.log(item.row.slice(5));
  // image_paths.unshift(item.cover_image);
  let content = `<div>${make_img(
    item.cover_image
  )} <div class="item_text">${item.text
    .split("|")
    .map(a => `<p>${a}</p>`)
    .join("")}</div>${image_paths.map(make_img)}</div>`;
  let path = `dist/${item.slug}`;
  fs.mkdirSync(path);
  fs.writeFileSync(
    `${path}/index.html`,
    render(index_template, { content, title })
  );
}

console.log(process.env.NODE_ENV);

function create_index_items_content(items) {
  let result = "";
  for (var i = 0; i < items.length; i++) {
    let piece = items[i];
    // for local testing
    let src =
      process.env.NODE_ENV != "production"
        ? `../images/${piece.cover_image}` // it's up one when just loadin git in dev, because it's in dist
        : `images/${piece.cover_image}`; // in prod, images will be at the top level of dist
    // for prod, we'll need   to copy all the images over to dist
    result += `<div class="thumb"><a href="${
      piece.slug
    }/"><img src="${src}"></a></div>`;
  }
  return `<div id="index_items">${result}</div>`;
}

function slugify(text, retain_dots = false) {
  let reg_ex = retain_dots ? /[^\w\s-\.]/g : /[^\w\s-]/g;
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(reg_ex, "") // except '.' depending on retain_dots, remove non-word [a-z0-9_], non-whitespace, non-hyphen characters
    .replace(/[\s_-]+/g, "_") // swap any length of whitespace, underscore, hyphen characters with a single _
    .replace(/^-+|-+$/g, ""); // remove leading, trailing -
}
