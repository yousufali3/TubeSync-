export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (trimmed.length === 11 && !trimmed.includes('/')) {
    return trimmed;
  }
  
  try {
    let urlString = trimmed;
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      urlString = 'https://' + trimmed;
    }
    const url = new URL(urlString);
    
    if (url.hostname === 'youtu.be') {
      return url.pathname.substring(1).split(/[?#]/)[0];
    }
    
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/shorts/')) {
        return url.pathname.split('/')[2]?.split(/[?#]/)[0] || null;
      }
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/')[2]?.split(/[?#]/)[0] || null;
      }
      if (url.pathname.startsWith('/watch')) {
        return url.searchParams.get('v');
      }
    }
  } catch (e) {
    // Regex fallback
    const regExp = /^.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = trimmed.match(regExp);
    if (match && match[1].length === 11) {
      return match[1];
    }
  }
  return null;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

let apiLoaded = false;
let apiCallbacks: Array<() => void> = [];

export function loadYouTubeAPI(callback: () => void) {
  if (window.YT && window.YT.Player) {
    callback();
    return;
  }
  
  apiCallbacks.push(callback);
  
  if (apiLoaded) return;
  apiLoaded = true;

  const prevCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = () => {
    if (prevCallback) prevCallback();
    apiCallbacks.forEach(cb => cb());
    apiCallbacks = [];
  };

  const tag = document.createElement('script');
  tag.src = 'https://www.youtube.com/iframe_api';
  const firstScriptTag = document.getElementsByTagName('script')[0];
  if (firstScriptTag && firstScriptTag.parentNode) {
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  } else {
    document.head.appendChild(tag);
  }
}
