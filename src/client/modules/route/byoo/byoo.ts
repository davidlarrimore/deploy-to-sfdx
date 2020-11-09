import { LightningElement, api, track, wire } from 'lwc';
import { multiTemplateURLBuilder } from '../../../../server/lib/multiTemplateURLBuilder';

export default class Byoo extends LightningElement {
  @api template;

  @track sandboxURL;
  @track regularURL;

  get scratchUrl() {
    return window.location.href.replace('byoo', 'launch');
  }

  async connectedCallback() {
    const authURL = multiTemplateURLBuilder(this.template, '/authURL');
    // console.log(authURL);
    this.regularURL = await (await fetch(authURL)).text();
    this.sandboxURL = await (await fetch(`${authURL}&base_url=https://test.salesforce.com`)).text();

    let thisURL = window.location.href;
    let parameterArray = new URL(thisURL).searchParams;
    
    if(undefined !== parameterArray.get('quickdeploy')){
      if(undefined !== parameterArray.get('sandbox')){
        window.location.href = this.sandboxURL;
      }else{
        window.location.href = this.regularURL;
      }
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
