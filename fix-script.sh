#!/bin/bash

# Fix first instance in confirmOrder
sed -i '546,548s!  // Get the detected language from the call data or use default\n  // @ts-ignore - language field might not exist on type\n  const detectedLanguage = (activeCalls\[callSid\]?.language as SupportedLanguage) || aiVoiceSettings.defaultLanguage;!  // Get the detected language from the call data or use default\n  const detectedLanguage = activeCalls[callSid]?.language || aiVoiceSettings.defaultLanguage;!' server/services/telephony/index.ts

# Fix second instance in retryOrder
sed -i '686,688s!  // Get the detected language from the call data or use default\n  // @ts-ignore - language field might not exist on type\n  const detectedLanguage = (activeCalls\[callSid\]?.language as SupportedLanguage) || aiVoiceSettings.defaultLanguage;!  // Get the detected language from the call data or use default\n  const detectedLanguage = activeCalls[callSid]?.language || aiVoiceSettings.defaultLanguage;!' server/services/telephony/index.ts

# Fix third instance in selectLanguage
sed -i '1050,1052s!    // @ts-ignore - add language field to the call data\n    activeCalls\[callSid\].language = selectedLanguage;!    activeCalls[callSid].language = selectedLanguage;!' server/services/telephony/index.ts

# Fix fourth instance in selectLanguage
sed -i '1056,1058s!      // @ts-ignore - add language field to the call data\n      historyCall.language = selectedLanguage;!      historyCall.language = selectedLanguage;!' server/services/telephony/index.ts