export default `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Document</title>
    <style>
      button {
        cursor: pointer;
      }
      html {
        font-family: sans-serif;
        -ms-text-size-adjust: 100%;
        -webkit-text-size-adjust: 100%;
      }
      body {
        margin: 0;
      }
      h1 {
        font-size: 2em;
        margin: 0.67em 0;
      }
      img {
        border: 0;
      }
      svg:not(:root) {
        overflow: hidden;
      }
      hr {
        -moz-box-sizing: content-box;
        box-sizing: content-box;
        height: 0;
      }
      button {
        color: inherit;
        font: inherit;
        margin: 0;
      }
      button {
        overflow: visible;
      }
      button {
        text-transform: none;
      }
      button {
        -webkit-appearance: button;
        cursor: pointer;
      }
      button::-moz-focus-inner {
        border: 0;
        padding: 0;
      }
      body {
        background-color: #eaeef0;
        color: #183247;
      }
      * {
        box-sizing: border-box;
        -webkit-user-drag: none;
        min-width: 0;
        min-height: 0;
      }
      *:before,
      *:after {
        box-sizing: border-box;
      }
      *:focus {
        outline: none;
      }
      html {
        -webkit-tap-highlight-color: transparent;
        -webkit-font-smoothing: antialiased;
        font-size: 62.5%;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Roboto",
          "Helvetica Neue", sans-serif;
        text-rendering: optimizeLegibility;
        font-size: 1.5rem;
        line-height: 1.5;
        cursor: auto;
        color: #616471;
        word-wrap: break-word;
      }
      h1:first-child,
      h3:first-child {
        margin-top: 0;
      }
      html,
      body,
      div,
      h1,
      h3,
      img {
        margin: 0;
        padding: 0;
      }
      hr {
        border-top: 1px solid #e4eaec;
      }
      button {
        padding: 5px 10px;
        background: rgba(0, 0, 0, 0.04);
        border: 1px solid #eee;
        border-radius: 4px;
        margin: 3px;
      }
      button:hover {
        border-color: #ddd;
        background: rgba(0, 0, 0, 0.1);
      }
      /*! CSS Used from: Embedded */
      .buzuBf {
        max-width: 940px;
        background: white;
        margin-right: auto;
        margin-left: auto;
        margin-top: 20px;
        margin-right: auto;
        margin-left: auto;
        margin-top: 20px;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 5%);
      }
      .buzuBf .li-item {
        position: relative;
        display: -webkit-box;
        display: -webkit-flex;
        display: -ms-flexbox;
        display: flex;
        -webkit-box-pack: justify;
        -webkit-justify-content: space-between;
        -ms-flex-pack: justify;
        justify-content: space-between;
        -webkit-align-items: center;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        padding: 0.5rem 1rem;
        color: #212121;
        -webkit-text-decoration: none;
        text-decoration: none;
        background-color: #fff;
        border: 1px solid rgba(0, 0, 0, 0.125);
      }
      .buzuBf .li-item h3 {
        display: inline;
      }
      .buzuBf .li-item span {
        padding: 5px;
        background: #486dff;
        font-weight: bold;
        border-radius: 5px;
        color: white;
      }
      @media (max-width: 1300px) {
        .buzuBf {
          margin: 10px;
        }
      }
      @media (max-width: 700px) {
        .buzuBf img,
        .buzuBf hr {
          display: none;
        }
        .buzuBf .title {
          font-size: 16px;
        }
      }
      /*! CSS Used fontfaces */
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fCRc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF,
          U+A640-A69F, U+FE2E-FE2F;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fABc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fCBc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+1F00-1FFF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fBxc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0370-03FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fCxc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169,
          U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fChc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB,
          U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 300;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmSU5fBBc4AMP6lQ.woff2)
          format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
          U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
          U+2212, U+2215, U+FEFF, U+FFFD;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu72xKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF,
          U+A640-A69F, U+FE2E-FE2F;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu5mxKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu7mxKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+1F00-1FFF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4WxKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+0370-03FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu7WxKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169,
          U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu7GxKKTU1Kvnz.woff2)
          format("woff2");
        unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB,
          U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 400;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2)
          format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
          U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
          U+2212, U+2215, U+FEFF, U+FFFD;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fCRc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF,
          U+A640-A69F, U+FE2E-FE2F;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fABc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fCBc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+1F00-1FFF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fBxc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0370-03FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fCxc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169,
          U+01A0-01A1, U+01AF-01B0, U+1EA0-1EF9, U+20AB;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fChc4AMP6lbBP.woff2)
          format("woff2");
        unicode-range: U+0100-024F, U+0259, U+1E00-1EFF, U+2020, U+20A0-20AB,
          U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
      }
      @font-face {
        font-family: "Roboto";
        font-style: normal;
        font-weight: 500;
        src: url(https://fonts.gstatic.com/s/roboto/v27/KFOlCnqEu92Fr1MmEU9fBBc4AMP6lQ.woff2)
          format("woff2");
        unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6,
          U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193,
          U+2212, U+2215, U+FEFF, U+FFFD;
      }
    </style>
  </head>
  <body>
    <div class="sc-exkUMo buzuBf">
      <div
        style="
          display: flex;
          justify-content: space-between;
          align-items: center;
        "
      >
        <div><h1 class="title">Daily Report - {{reportDate}}</h1></div>
        <div><img width="200px" src="https://ualett.com/logo_blue.png" /></div>
      </div>
      <hr />
      <br />
      <div class="li-item">
        <h3>Active Deals</h3>
        <span>{{activeDeals}}</span>
      </div>
      <div class="li-item">
        <h3>Dwolla Balance</h3>
        <span>{{dwollaBalance}}</span>
      </div>
      
      <div class="li-item">
        <h3>Deals Created</h3>
        <span>{{todayDeals}}</span>
      </div>
      <div class="li-item">
        <h3>Processed Payments ({{processedStartDate}} - {{processedEndDate}})</h3>
        <span>{{processed}}</span>
      </div>
    </div>
  </body>
</html>`;
