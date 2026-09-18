#!/bin/zsh
# Archive a Release build and upload it to TestFlight, using the Apple ID that is
# signed in to Xcode (Xcode → Settings → Accounts). Needs a PAID Apple Developer
# team selected in the project (a "Personal Team" cannot use TestFlight).
#
#   tools/testflight/upload.sh            # bumps the build number, archives, uploads
#
set -euo pipefail
cd "$(dirname "$0")/../.."
ARCHIVE=/tmp/snatchd-build/Snatchd.xcarchive
BUILD=$(( $(date +%s) / 60 ))   # monotonically increasing build number, no bookkeeping
echo "→ build number $BUILD"
xcodebuild -project Snatchd.xcodeproj -scheme Snatchd -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates CURRENT_PROJECT_VERSION=$BUILD archive 2>&1 | grep -E 'error:|warning: .*(sign|provision)|ARCHIVE (SUCCEEDED|FAILED)' | sort -u
echo "→ uploading to App Store Connect"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportOptionsPlist tools/testflight/ExportOptions.plist \
  -exportPath /tmp/snatchd-build/export -allowProvisioningUpdates 2>&1 | grep -E 'error:|Upload succeeded|EXPORT (SUCCEEDED|FAILED)|Uploaded' | sort -u
echo "→ done. In App Store Connect → TestFlight the build shows as 'Processing' for ~10 min, then add testers."
