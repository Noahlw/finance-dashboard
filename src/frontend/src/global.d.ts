declare namespace google {
  namespace script {
    namespace run {
      function withSuccessHandler(handler: Function): any;
      function withFailureHandler(handler: Function): any;
      function api_getMyClaims(): void;
      function api_submitClaim(payload: any): void;
      function api_editClaim(payload: any): void;
      function api_uploadReceipt(fileName: string, mimeType: string, base64Data: string, vendor: string, receiptDate: string, receiptTotal: number): void;
    }
  }
}
