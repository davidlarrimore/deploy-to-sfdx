import { LightningElement, api, track } from 'lwc';
import { multiTemplateURLBuilder } from '../../../../server/lib/multiTemplateURLBuilder';

export default class QuickDeploy extends LightningElement {
  @api template;

  @track salesforceAuthUrl;

  @track isSandbox = false;
    
  get scratchUrl() {
    return window.location.href.replace('quickDeploy', 'launch');
  }

  async connectedCallback() {
    const authURL = multiTemplateURLBuilder(this.template, '/authURL');
    // console.log(authURL);

    let thisURL = window.location.href;
    let parameterArray = new URL(thisURL).searchParams;
    
    if(null !== parameterArray.get('sandbox')){
      this.salesforceAuthUrl = await (await fetch(`${authURL}&base_url=https://test.salesforce.com`)).text();
      this.isSandbox = true;
    }else{
      this.salesforceAuthUrl = await (await fetch(authURL)).text();
    }

    if(null !== parameterArray.get('quickdeploy')){
        window.location.href = this.salesforceAuthUrl;
    }
  }

  get getParameter() {
    // if you have Dynamic URL Use (window.location.href)
    var testURL = window.location.href;
    var newURL = new URL(testURL).searchParams;
    console.log('Template ===> '+newURL.get('template'));
    //console.log('image ====> '+newURL.get('image'));
    return newURL.get('template');
  }

  get templateArray() {
    // console.log(this.template);
    return Array.isArray(this.template) ? this.template : [this.template];
  }
}
