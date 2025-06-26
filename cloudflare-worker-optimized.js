// 優化版的 Cloudflare Worker
export default {
  async fetch(request, env, ctx) {
    try {
      // 將請求的 URL 修改為目標地址
      const url = new URL(request.url);
      
      // 設定目標伺服器
      url.hostname = 'office.fanpokka.ai';
      url.port = '8001';
      url.protocol = 'http:'; // 明確指定協議
      
      // 過濾和修改某些標頭
      const modifiedHeaders = new Headers(request.headers);
      
      // 移除可能造成問題的標頭
      modifiedHeaders.delete('host');
      modifiedHeaders.delete('cf-ray');
      modifiedHeaders.delete('cf-visitor');
      
      // 設定正確的 Host 標頭（不需要包含 port，因為是標準 HTTP）
      modifiedHeaders.set('host', 'office.fanpokka.ai');
      
      // 創建新的請求對象
      const modifiedRequest = new Request(url.toString(), {
        method: request.method,
        headers: modifiedHeaders,
        body: request.body,
        redirect: 'follow'
      });
      
      // 轉發請求到目標地址
      const response = await fetch(modifiedRequest);
      
      // 創建新的回應對象，添加 CORS 標頭
      const modifiedResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
      
      // 添加 CORS 標頭（如果需要）
      modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
      modifiedResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      modifiedResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      // 處理 OPTIONS 預檢請求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          }
        });
      }
      
      return modifiedResponse;
      
    } catch (error) {
      // 錯誤處理
      console.error('Proxy error:', error);
      return new Response('Proxy Error: ' + error.message, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  },
};
