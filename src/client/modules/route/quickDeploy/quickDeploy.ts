import { LightningElement, api, track } from 'lwc';
import { multiTemplateURLBuilder } from '../../../../server/lib/multiTemplateURLBuilder';

export default class QuickDeploy extends LightningElement {
  @api template;
  @api quickdeploy;

  @api instanceUrl;
  @api accessToken;

  @api state;
  @api sandbox;
  @api packageversionid;
  @api userId;
  @api orgId;

  @track installButtonUrl;
  @track preAuthURL;

  @track packageInfo;

  get scratchUrl() {
    return window.location.href.replace('quickDeploy', 'launch');
  }

  async connectedCallback() {
    console.log(`Running connectedCallback`);
    //First thing we do is Authorize
    if(!this.accessToken){
      let preAuthURLTemplate = this.preAuthMultiTemplateURLBuilder(this.template, '/preAuth');
      this.preAuthURL = await (await fetch(preAuthURLTemplate)).text();

      if(this.sandbox && this.sandbox === 'true'){
        this.preAuthURL = await (await fetch(`${preAuthURLTemplate}&base_url=https://test.salesforce.com`)).text();
      }
      window.location.href = this.preAuthURL;
      //this.installButtonUrl = this.preAuthURL;

    }else{
      const authURL = multiTemplateURLBuilder(this.template, '/authURL');
      
      if(this.sandbox && this.sandbox === 'true'){
        this.installButtonUrl = await (await fetch(`${authURL}&base_url=https://test.salesforce.com`)).text();
      }else{
        this.installButtonUrl = await (await fetch(authURL)).text();
      }
  
      if(!this.quickdeploy){
        //window.location.href = await (await fetch(authURL)).text();
      }
    }


  }

  get isSandboxFlag(){
    if (this.sandbox && this.sandbox === 'true'){
      return true;
    }
    return false;
  }

  get isSandbox(){
    if(this.sandbox && this.sandbox === 'true'){
      return 'Yes';
    }
    return 'No';
  }

  

  get isSourceInstallFlag(){
    if(this.accessToken){
      if (this.template){
        return true;
      }
    }
    return false; 
  }

  get isPackageInstallFlag(){
    if(this.accessToken){
      if (this.packageversionid){
        return true;
      }
    }
    return false; 
  }

  get installType(){
    if (this.isSourceInstallFlag){
      return 'Source(Github)';
    }
    return 'Salesforce Package';
  }

  get canInstallFlag(){
    if (this.isPackageInstallFlag || this.isSourceInstallFlag){
      return true;
    }
    return false;
  }

  get templateArray() {
    //console.log(this.template);
    if(this.accessToken){
      return Array.isArray(this.template) ? this.template : [this.template];
    }
    return '';
  }

  get packageArray() {
    //console.log(this.packageversionid);
    if(this.accessToken){
      return Array.isArray(this.packageversionid) ? this.packageversionid : [this.packageversionid];
    }
    return '';
  }


  preAuthMultiTemplateURLBuilder(templatesURLs: string[] | string, preQueryURL = ''){
    let baseURL = '';
    if (Array.isArray(templatesURLs)) {
      baseURL += `${preQueryURL}?template=${templatesURLs.join('&template=')}`;
    }else{
      baseURL += `${preQueryURL}?template=${templatesURLs}`;
    }

    if (this.sandbox && this.sandbox === 'true'){
      baseURL += `&sandbox=true`;
    }

    if(this.quickdeploy && this.quickdeploy === 'true'){
      baseURL += `&quickdeploy=true`;
    }

    return baseURL;
};

}
