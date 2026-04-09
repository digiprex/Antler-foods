# KOT (Kitchen Order Ticket) Auto-Printing: Comprehensive Research

## PART 1: How Major Restaurant Tech Companies Handle Printing

---

### 1. Toast

- **Printing approach:** Proprietary, hardware-locked ecosystem. Toast sells its own branded hardware (Toast Terminal, Toast Flex) that includes proprietary Epson-based kitchen printers. The POS communicates with kitchen printers over the local network.
- **How it works:** LAN-based direct printing from Toast terminals. Orders route to specific kitchen printer stations based on menu item categories (e.g., drinks to bar printer, food to kitchen printer). Printers connect via Ethernet to the restaurant's local network.
- **Supported printers:** Toast-branded Epson thermal printers only (Epson TM-series rebadged). Must be purchased through Toast.
- **Multi-location/multi-printer:** Yes, supports multiple print stations per location and multi-location management.
- **Key detail:** Completely closed ecosystem. No third-party printer support. Hardware is leased/purchased through Toast.

### 2. Square (Square for Restaurants)

- **Printing approach:** LAN-based printing via Square Kitchen Display System (KDS) or supported Star Micronics printers.
- **How it works:** Square's restaurant POS sends print jobs over the local network to compatible kitchen printers. Also offers a KDS (digital screen) as an alternative to paper tickets. The iPad/terminal communicates with printers via Bluetooth or Ethernet.
- **Supported printers:** Star Micronics SP700 (impact, for kitchen), Star Micronics TSP143III (thermal, for receipts), Star Micronics TSP654II. Limited to Square-certified models.
- **Multi-location/multi-printer:** Yes, supports routing different menu categories to different printers. Multi-location supported via Square Dashboard.
- **Key detail:** Semi-open -- only specific Star Micronics models certified. No cloud printing for KOT.

### 3. Clover

- **Printing approach:** Proprietary hardware ecosystem with integrated printing.
- **How it works:** Clover devices (Station, Mini, Flex) connect to Clover-branded printers via USB or LAN. Kitchen printing is configured through the Clover Dashboard, routing orders to designated kitchen printers.
- **Supported printers:** Clover-branded printers (rebadged Seiko and Star Micronics). The Clover Kitchen Printer is a Star Micronics SP700 impact printer. Some third-party Epson and Star models work but are not officially supported.
- **Multi-location/multi-printer:** Yes, multi-printer routing by category. Multi-location via Clover Dashboard.
- **Key detail:** Mostly closed ecosystem, hardware tied to Clover merchant account.

### 4. DoorDash (Merchant Tablets)

- **Printing approach:** Tablet-based with optional Bluetooth/USB printer.
- **How it works:** DoorDash provides a merchant tablet (Android-based) or the merchant uses the DoorDash Order Manager app. Auto-print can be enabled to automatically print incoming orders. The tablet connects to a compatible Bluetooth or USB thermal printer.
- **Supported printers:** Star Micronics TSP650II, Star Micronics TSP143IV, Epson TM-m30. Limited list of officially supported models.
- **Multi-location/multi-printer:** Multi-location yes (separate tablet per location). Single printer per tablet typically.
- **Key detail:** Auto-print feature sends orders to printer as soon as they're confirmed. Uses Android's native Bluetooth/USB printing stack.

### 5. Uber Eats (Merchant Tablets)

- **Printing approach:** Tablet-based with integrated printer support via Uber Eats Orders app.
- **How it works:** The Uber Eats merchant app on tablet can auto-print orders when they arrive. Connects to Bluetooth thermal printers. Uber also integrates with Otter/Ordermark for aggregated printing across multiple platforms.
- **Supported printers:** Star Micronics (TSP654II, TSP143), Epson TM-series. Recently added support for more Bluetooth printers.
- **Multi-location/multi-printer:** Multi-location via separate tablets. Single printer per tablet.
- **Key detail:** Added webhook-based order notification system that third-party integrators can use to trigger printing server-side.

### 6. ChowNow

- **Printing approach:** Tablet-based with auto-print via ChowNow Order Manager app, or POS integration.
- **How it works:** ChowNow provides a branded tablet or integrates with existing POS systems (Square, Toast, Clover). For direct ChowNow tablets, orders auto-print to a connected Bluetooth or USB thermal printer. For POS integrations, printing goes through the POS's native printing system.
- **Supported printers:** Star Micronics TSP143 (Bluetooth/USB), Epson TM-m30. Limited certified list.
- **Multi-location/multi-printer:** Multi-location yes. Usually single printer per tablet.
- **Key detail:** Also partners with Otter/Cuboh for aggregated order printing.

### 7. Olo

- **Printing approach:** POS integration-first model (no proprietary printing).
- **How it works:** Olo is primarily a digital ordering platform for enterprise restaurants. It integrates with the restaurant's existing POS system (Toast, Aloha NCR, Oracle MICROS, etc.), and the POS handles printing. Olo Rails injects online orders directly into the POS queue, which then prints KOTs through the POS's native kitchen printing setup.
- **Supported printers:** Whatever the integrated POS supports. No proprietary printer requirements.
- **Multi-location/multi-printer:** Yes, enterprise-grade multi-location. Printing is entirely delegated to POS.
- **Key detail:** Olo does not handle printing itself -- it is an ordering middleware that pushes orders into POS systems.

### 8. Grubhub

- **Printing approach:** Tablet-based with auto-print, similar to DoorDash/Uber Eats.
- **How it works:** Grubhub for Restaurants tablet app can auto-print orders. Connects via Bluetooth to supported thermal printers. Also integrates with POS systems (via middleware like Olo, Otter, or Cuboh) where printing happens through the POS.
- **Supported printers:** Star Micronics Bluetooth printers, Epson TM-m30.
- **Multi-location/multi-printer:** Multi-location yes. Typically single printer per tablet.
- **Key detail:** Grubhub has been moving toward POS integration (now owned by Wonder Group) rather than standalone tablet printing.

### 9. Lightspeed (Restaurant)

- **Printing approach:** LAN-based printing from Lightspeed Restaurant POS (formerly iKentoo).
- **How it works:** iPad-based POS sends print jobs to network-connected thermal and impact printers. Kitchen printing routes by production center (e.g., bar, kitchen, prep). Uses direct LAN communication (not cloud-based for KOT).
- **Supported printers:** Epson TM-m30, Epson TM-T20III, Star Micronics TSP100, Star Micronics SP700 (impact for kitchen). Must be from Lightspeed's certified list.
- **Multi-location/multi-printer:** Yes, multiple print stations per location. Full multi-location management.
- **Key detail:** Offers KDS as a digital alternative. Printing is local network only -- no cloud KOT printing.

### 10. Revel Systems (now Shift4)

- **Printing approach:** LAN-based printing from iPad POS.
- **How it works:** iPad connects to network printers via the Revel local server (a Mac Mini or dedicated appliance that acts as a print relay). Orders route to kitchen printers by category. The local server manages the print queue.
- **Supported printers:** Star Micronics TSP143, Epson TM-series. Certified hardware list.
- **Multi-location/multi-printer:** Yes, enterprise-grade multi-location and multi-printer routing.
- **Key detail:** Requires a "Revel Server" (local always-on device) to manage printing. Now part of Shift4.

### 11. TouchBistro

- **Printing approach:** LAN-based printing with KDS digital option.
- **How it works:** iPad POS communicates with kitchen printers over the local network. Orders appear on either a KDS screen (MicroTouch touchscreen) or print on a kitchen printer. The system works even offline (local network communication).
- **Supported printers:** Epson TM-T20II, Star Micronics TSP143, impact printers for kitchen. Optional sticky label printers.
- **Multi-location/multi-printer:** Yes, multi-printer routing. Multi-location management available.
- **Key detail:** Strong offline capability -- all printing works without internet.

### 12. Owner.com

- **Printing approach:** POS integration + Kitchen Tablet + third-party aggregators.
- **How it works:** Owner.com integrates natively with Square and Clover POS systems, and also connects through Otter. For restaurants using Owner's direct ordering, they offer a Kitchen Tablet that receives orders. Printing is handled through the integrated POS system or the tablet connecting to a local printer.
- **Supported printers:** Depends on integrated POS (Square or Clover printers). Kitchen Tablet can connect to Bluetooth printers.
- **Multi-location/multi-printer:** Yes, multi-location support.
- **Key detail:** Owner.com is primarily an online ordering/marketing platform, not a POS. Printing is delegated to partner POS or their kitchen tablet.

### 13. Ordermark / Nextbite / Otter (by Uber)

- **Printing approach:** Cloud-to-local printing via dedicated hardware hub.
- **How it works:** Otter (formerly Ordermark) aggregates orders from multiple delivery platforms (DoorDash, Uber Eats, Grubhub, etc.) into a single dashboard. They ship a dedicated Otter tablet/hub that connects to a thermal printer. Orders from all platforms auto-print on a single printer with a unified ticket format. Uses cloud polling -- the device checks for new orders periodically.
- **Supported printers:** Ships with a bundled Epson or Star Micronics printer. Can also connect to existing network printers.
- **Multi-location/multi-printer:** Yes, multi-location. Supports multiple print stations with menu item routing.
- **Key detail:** The key value proposition is aggregating multiple platforms into one printer. Now owned by Uber and being integrated into the Uber merchant ecosystem.

### 14. Cuboh

- **Printing approach:** Cloud-to-local printing via Cuboh tablet.
- **How it works:** Similar to Otter -- Cuboh aggregates orders from multiple delivery platforms into one tablet. The tablet auto-accepts orders and can auto-print to a connected thermal printer. Uses cloud polling to retrieve new orders.
- **Supported printers:** Epson TM-series, Star Micronics TSP-series. Ships with or recommends specific models.
- **Multi-location/multi-printer:** Yes, multi-location. Order routing to multiple printers.
- **Key detail:** Focuses on tablet consolidation -- one tablet replaces multiple delivery platform tablets. Auto-acceptance in ~0.1 seconds.

---

## PART 2: Printing Technologies Deep Dive

---

### 1. QZ Tray

| Attribute | Detail |
|---|---|
| **What it is** | Open-source Java desktop application that bridges web browsers to local printers and hardware devices |
| **Open source?** | Yes, LGPL 2.1 license |
| **Pricing** | Free (community/self-signed cert), $599/yr (Premium -- trusted cert + support), $2,999/yr (Company Branded -- white-label) |
| **How it works** | Runs as a system tray application. Web pages communicate with it via WebSocket on localhost. JavaScript API sends print commands (raw ESC/POS, ZPL, PDF, images, HTML) which QZ Tray routes to the specified local printer. No cloud component -- purely local bridge. |
| **Supported printers** | Any printer accessible from the OS: thermal (Epson, Star, Citizen, Boca, Dymo), label (Zebra, SATO), and standard printers. Supports ESC/POS, ZPL, EPL, SBPL, FGL, PCL, PDF, PNG, HTML. Also supports serial, HID, USB, socket, and file I/O. |
| **Multi-location/multi-printer** | Multi-printer on same machine yes. Multi-location requires QZ Tray installed on each location's computer. |
| **Best for** | Web apps that need to silently print to local thermal printers without print dialogs. Very popular in restaurant ordering web apps. |
| **Downsides** | Requires installing a desktop app on each machine. Java dependency. Certificate management for trusted operation. |

### 2. PrintNode

| Attribute | Detail |
|---|---|
| **What it is** | Cloud printing SaaS -- REST API that routes print jobs from cloud to local printers |
| **Open source?** | No, proprietary |
| **Pricing** | Free tier: 50 prints/mo, 1 computer. Essential: $9/mo (5,000 prints, 3 computers). Standard: $29/mo (25,000 prints, 5 computers). Premium: $99/mo (200,000 prints, unlimited computers). First month free trial. |
| **How it works** | Install PrintNode Client on a computer (Windows/macOS/Linux/Raspberry Pi). Client registers with PrintNode cloud. Your server sends a print job via REST API to PrintNode's cloud. Cloud routes it to the correct client, which prints locally. Polling-based -- client polls cloud for new jobs. |
| **Supported printers** | Any printer installed on the OS (thermal, laser, inkjet). Supports PDF, raw bytes. Works with any printer that has an OS driver. |
| **Multi-location/multi-printer** | Yes, excellent multi-location support. Sub-accounts for resellers. Unlimited computers on Premium tier. |
| **Best for** | SaaS platforms that need to print to merchant printers without building their own print infrastructure. Great API, reliable. |
| **Downsides** | Recurring cost per print. Requires internet. Small latency from cloud routing. Requires client install. |

### 3. Star CloudPRNT / Star CloudPRNT Next

| Attribute | Detail |
|---|---|
| **What it is** | Firmware-level cloud printing protocol built into Star Micronics printers. CloudPRNT Next uses MQTT for faster delivery. |
| **Open source?** | Protocol spec is documented but not open source. SDK/samples available. |
| **Pricing** | Free to use -- it's a firmware feature of compatible Star printers. No subscription. |
| **How it works** | **CloudPRNT (original):** The printer itself polls a server endpoint (HTTP GET) at configurable intervals (e.g., every 2-5 seconds) asking "do you have a print job for me?" If yes, the server returns the print data. **CloudPRNT Next:** Uses MQTT pub/sub, so the printer subscribes to an MQTT topic and prints immediately when a message arrives (much lower latency than polling). Your server just needs to implement the CloudPRNT server-side endpoint or publish to MQTT. |
| **Supported printers** | Star Micronics printers only: TSP654II, TSP143IV, mC-Print2, mC-Print3, SP700 (varies by model/firmware). Must be CloudPRNT-capable model. |
| **Multi-location/multi-printer** | Yes, each printer polls independently. Scale to thousands of printers. Each printer has a unique identifier. |
| **Best for** | Web-based ordering platforms that need zero-install printing. The printer does all the work -- no local software install required. Just configure the printer to point at your server URL. |
| **Downsides** | Star Micronics printers only. Original CloudPRNT has polling latency (2-5 sec). Requires implementing the server-side protocol. |

### 4. Star WebPRNT

| Attribute | Detail |
|---|---|
| **What it is** | HTTP-based local printing protocol for Star Micronics printers. The printer runs a small web server. |
| **Open source?** | SDK is freely available, protocol is documented. Not open source per se. |
| **Pricing** | Free -- firmware feature of compatible Star printers. |
| **How it works** | The Star printer runs an HTTP server on the local network (typically port 80/443). Your web page sends an HTTP POST with XML-formatted print commands directly to the printer's IP address. JavaScript SDK available. Prints immediately. Works from browser JavaScript (same-network, may have CORS considerations). |
| **Supported printers** | Star Micronics printers with WebPRNT firmware: TSP654II, TSP143, mC-Print series. |
| **Multi-location/multi-printer** | Multi-printer on same network yes. Not cloud-capable -- requires same LAN. |
| **Best for** | Browser-based POS on the same local network as the printer. No install required. Very fast. |
| **Downsides** | LAN only (not cloud). CORS/mixed-content issues in modern browsers (HTTPS page cannot POST to HTTP printer without workarounds). Star printers only. |

### 5. Star MIKE (Managed Integrated Kitchen Ecosystem)

| Attribute | Detail |
|---|---|
| **What it is** | Star Micronics' cloud-based restaurant order management platform that includes auto-printing, KDS, and order aggregation. |
| **Open source?** | No, proprietary SaaS. |
| **Pricing** | Subscription-based (pricing varies, typically bundled with hardware purchase). Contact Star for quotes. |
| **How it works** | MIKE is a cloud platform that aggregates orders from multiple online ordering providers and routes them to Star CloudPRNT-enabled printers or KDS screens. It uses CloudPRNT/CloudPRNT Next under the hood. Restaurants configure which items go to which printer/station via the MIKE dashboard. |
| **Supported printers** | Star Micronics CloudPRNT printers (mC-Print3, TSP654II, etc.). Also supports Star's KDS displays. |
| **Multi-location/multi-printer** | Yes, designed for multi-location chains with multiple print stations. |
| **Best for** | Restaurants using Star hardware that want an out-of-the-box cloud printing solution with order aggregation. |
| **Downsides** | Locked to Star hardware. Subscription cost. Less flexible than building your own CloudPRNT integration. |

### 6. Epson ePOS SDK

| Attribute | Detail |
|---|---|
| **What it is** | Epson's SDK for controlling Epson TM-series thermal printers from web and mobile applications. |
| **Open source?** | No, proprietary Epson SDK. Free to download and use. |
| **Pricing** | Free (SDK download from Epson developer portal). No licensing fees. |
| **How it works** | **ePOS SDK for JavaScript:** The Epson printer runs a built-in web server. Your web page connects via WebSocket to the printer on the local network and sends print commands using the ePOS API (JavaScript). Supports device discovery on the LAN. **ePOS SDK for iOS/Android:** Native SDK for mobile apps. Connects via Bluetooth, USB, or TCP/IP. |
| **Supported printers** | Epson TM-series only: TM-m30, TM-m50, TM-T88VI, TM-T88VII, TM-T20III, TM-U220 (impact), TM-L90, etc. |
| **Multi-location/multi-printer** | Multi-printer on same LAN yes. Not inherently cloud-capable (LAN only for JavaScript SDK). |
| **Best for** | Browser-based POS apps using Epson hardware on local network. |
| **Downsides** | Epson printers only. LAN only for web SDK. CORS/mixed-content issues similar to Star WebPRNT. |

### 7. Epson Connect

| Attribute | Detail |
|---|---|
| **What it is** | Epson's cloud printing service that allows remote printing to Epson printers over the internet. |
| **Open source?** | No, proprietary. |
| **Pricing** | Free for basic use. Epson Connect API available for developers. |
| **How it works** | Printer registers with Epson's cloud service and gets an email address. You can send print jobs by emailing the printer or via Epson Connect API. The printer polls Epson's cloud for jobs. Mainly designed for document/photo printing, not optimized for high-speed receipt printing. |
| **Supported printers** | Select Epson printers with Epson Connect firmware (mostly consumer/office printers, limited TM-series support). |
| **Multi-location/multi-printer** | Yes, each printer has its own cloud identity. |
| **Best for** | Remote document printing. Not ideal for high-speed KOT printing. |
| **Downsides** | High latency. Not designed for receipt printing workflows. Limited TM-series support. |

### 8. Google Cloud Print (DEPRECATED)

| Attribute | Detail |
|---|---|
| **What it is** | Was Google's cloud printing service allowing any device to print to any cloud-connected printer. |
| **Open source?** | No. |
| **Pricing** | Was free. |
| **How it works** | "Cloud Ready" printers connected directly to Google's service. Legacy printers used a Chrome-based "Cloud Print Connector." Web apps sent print jobs to Google's API, which routed to the correct printer. Also had a local mode (Privet protocol) similar to AirPrint. |
| **Status** | **Shut down December 31, 2020.** Google cited improvements in ChromeOS native printing and third-party solutions. |
| **What replaced it** | No direct successor. ChromeOS has native CUPS-based printing. For cloud use cases, PrintNode, QZ Tray, or manufacturer cloud solutions (Star CloudPRNT, Epson Connect) fill the gap. |
| **Relevance** | Some older restaurant platforms built on Google Cloud Print had to migrate. Not viable for any new development. |

### 9. PushPrinter

| Attribute | Detail |
|---|---|
| **What it is** | Free thermal receipt printer software for POS and online ordering businesses. |
| **Open source?** | Unclear -- marketed as free software but source availability not confirmed. |
| **Pricing** | Free. |
| **How it works** | Cloud-connected local agent app that runs on Windows, Android, and Linux. Polls a cloud server for print jobs. Online ordering platforms integrate via API to send print jobs, which PushPrinter routes to the locally connected thermal printer. Designed specifically for online ordering auto-print use cases. |
| **Supported printers** | Thermal receipt printers (ESC/POS compatible). Works with most common brands (Epson, Star, generic USB thermal). |
| **Multi-location/multi-printer** | Multi-printer support. Each location runs its own PushPrinter instance. |
| **Best for** | Small online ordering businesses that need free auto-print. |
| **Downsides** | Smaller company, less documentation. Android support is useful for tablet-based setups. Limited enterprise features. |

### 10. PrintHero

| Attribute | Detail |
|---|---|
| **What it is** | Cloud printing service for POS and online ordering. (Note: printhero.com domain appears to be defunct/redirected as of 2026. printhero.co redirects to a lander page.) |
| **Open source?** | No. |
| **Pricing** | Previously had a subscription model. Current status uncertain. |
| **How it works** | Was a local agent + cloud API model similar to PrintNode. |
| **Status** | **Appears to be inactive or acquired.** Domain issues suggest the service may no longer be available. |
| **Relevance** | Not recommended for new projects. |

### 11. Epos Now

| Attribute | Detail |
|---|---|
| **What it is** | A full POS system (hardware + software) for retail and hospitality, not just a printing solution. |
| **Open source?** | No, proprietary. |
| **Pricing** | POS system from $349 (was $1,099). Monthly software subscription on top. |
| **How it works** | Epos Now is a complete POS, not a standalone printing solution. It includes receipt printing and kitchen display (KDS) as part of the POS package. Printers connect via USB/LAN to the Epos Now terminal. |
| **Supported printers** | Epos Now branded printers (rebadged Epson). Also sells cash drawers, scanners. |
| **Multi-location/multi-printer** | Yes. |
| **Best for** | Businesses wanting a complete POS, not developers looking for a printing API. |
| **Downsides** | Not a developer tool. Cannot be used standalone as a printing solution. |

### 12. Raw TCP/IP Printing (Port 9100)

| Attribute | Detail |
|---|---|
| **What it is** | Direct network socket communication with a printer on TCP port 9100 (JetDirect / AppSocket protocol). |
| **Open source?** | It's a standard protocol, not a product. |
| **Pricing** | Free -- it's raw networking. |
| **How it works** | Most network-capable thermal printers listen on TCP port 9100. You open a raw TCP socket connection to the printer's IP:9100 and send ESC/POS (or other PDL) bytes directly. No driver needed. In Node.js: `net.createConnection(9100, printerIP)` then write ESC/POS buffer. Libraries like `node-thermal-printer` and `escpos` abstract this. |
| **Supported printers** | Nearly all network thermal printers: Epson TM-series, Star TSP-series, Citizen, Bixolon, and many generic thermal printers. Universal. |
| **Multi-location/multi-printer** | Multi-printer on same LAN: yes (each has its own IP). Cross-network: requires VPN or port forwarding (not practical for cloud). |
| **Best for** | Server-side printing when your Node.js/Python server is on the same LAN as the printer. Very fast, no dependencies. |
| **Downsides** | LAN only (not cloud-routable without tunneling). No authentication/encryption. Need to generate ESC/POS bytes yourself (or use a library). No print job confirmation/status from most thermal printers. |

**Node.js libraries for raw TCP printing:**
- `node-thermal-printer` -- supports Epson, Star, Bixolon. TCP, USB, serial.
- `escpos` -- ESC/POS commands with TCP, USB, Bluetooth, serial adapters.
- `receipt-printer-encoder` -- generates ESC/POS and StarPRNT command buffers.

### 13. WebUSB API

| Attribute | Detail |
|---|---|
| **What it is** | Browser API that allows web pages to directly communicate with USB devices, including thermal printers. |
| **Open source?** | It's a W3C Community Group web standard. |
| **Pricing** | Free -- browser built-in. |
| **How it works** | Web page calls `navigator.usb.requestDevice()` to prompt user to select a USB device. Once authorized, the page can send raw bytes (ESC/POS commands) directly to the USB printer. No driver or local app needed. Works entirely in the browser. |
| **Supported printers** | Any USB thermal printer that accepts raw ESC/POS input. Tested with Epson TM-series, Star TSP-series, generic 58mm/80mm USB thermal. |
| **Browser support** | Chrome and Edge (Chromium-based) only. NOT supported in Firefox or Safari. Requires HTTPS. |
| **Multi-location/multi-printer** | Limited to USB printers physically connected to the user's computer. |
| **Best for** | Simple browser-based POS where the printer is USB-connected to the same computer running the browser. Zero-install solution. |
| **Downsides** | Chrome/Edge only. No Firefox/Safari. Requires user to grant USB permission each session (or on first use). USB only (not network printers). HTTPS required. Not suitable for server-triggered auto-printing (requires browser to be open). |

### 14. Loyverse POS Printing Approach

| Attribute | Detail |
|---|---|
| **What it is** | Free POS app (iOS/Android) with built-in receipt and kitchen printing. |
| **Open source?** | No, proprietary. |
| **Pricing** | Free POS app. Premium features (employee management, integrations) are paid add-ons. |
| **How it works** | Loyverse app on phone/tablet connects to thermal printers via Bluetooth, USB, or WiFi/LAN. For kitchen printing, designated "Kitchen Display" devices receive orders. Print jobs are sent directly from the app to the printer -- no cloud involvement for printing. Uses native Android/iOS Bluetooth and USB APIs for printer communication. |
| **Supported printers** | Long list of certified printers: Epson TM-m30, Star Micronics TSP143, various Bluetooth printers (e.g., Star SM-L200, Epson TM-P20). Also supports generic ESC/POS Bluetooth printers. |
| **Multi-location/multi-printer** | Multi-printer support for kitchen vs. receipt. Multi-location via Loyverse Dashboard. |
| **Best for** | Small restaurants wanting free POS with basic printing. |
| **Downsides** | Mobile app only (no web). Limited customization of ticket format. |

### 15. ExpressPrint

| Attribute | Detail |
|---|---|
| **What it is** | Could not find an active product with this exact name in the restaurant printing space. The domain expressprint.app does not resolve. There are various local print shops named "Express Print" but no notable SaaS printing solution by this name. |
| **Status** | **Not found / possibly defunct.** |
| **Note** | If you encountered this name in a specific context, it may be a white-labeled version of another printing solution, or a very niche/regional product. |

---

## PART 3: Comparison Matrix for Web-Based Ordering Platform (like Antler Foods)

For a Next.js web-based ordering platform that needs to auto-print KOTs at merchant locations, here are the most relevant solutions ranked by suitability:

### Tier 1: Best Fit for a Multi-Tenant Web Platform

| Solution | Install Required? | Cloud Capable? | Any Printer? | Cost | Complexity |
|---|---|---|---|---|---|
| **Star CloudPRNT** | No (firmware) | Yes (printer polls your server) | Star only | Free | Medium (implement server protocol) |
| **PrintNode** | Yes (client app) | Yes (REST API) | Any OS printer | $9-99/mo | Low (simple REST API) |
| **QZ Tray** | Yes (desktop app) | No (local only) | Any printer | Free-$599/yr | Medium (WebSocket + JS API) |
| **Raw TCP/IP (port 9100)** | No | No (LAN only) | Any network printer | Free | Medium (need ESC/POS generation) |

### Tier 2: Viable Alternatives

| Solution | Install Required? | Cloud Capable? | Any Printer? | Cost | Complexity |
|---|---|---|---|---|---|
| **PushPrinter** | Yes (local agent) | Yes | ESC/POS thermal | Free | Low |
| **Epson ePOS SDK** | No (firmware) | No (LAN only) | Epson only | Free | Medium |
| **Star WebPRNT** | No (firmware) | No (LAN only) | Star only | Free | Low |
| **WebUSB** | No | No (local USB only) | USB thermal | Free | Low-Medium |

### Recommended Approach for Antler Foods

Given the architecture (Next.js multi-tenant platform with API routes), the recommended approach would be a **hybrid strategy**:

1. **Primary: Star CloudPRNT (or CloudPRNT Next with MQTT)**
   - Best zero-install experience. Merchant buys a Star CloudPRNT printer, enters your server URL into printer settings, and it just works.
   - Your Next.js API route implements the CloudPRNT polling endpoint.
   - CloudPRNT Next (MQTT) reduces latency to near-instant.
   - No software install at merchant location.

2. **Fallback: PrintNode**
   - For merchants who already have non-Star printers.
   - Your server sends print jobs via PrintNode REST API.
   - Merchant installs PrintNode client on any computer connected to their printer.
   - Works with any printer brand.

3. **Browser-based option: QZ Tray or WebUSB**
   - For merchants who keep a browser open to your admin dashboard.
   - QZ Tray for broadest printer support, WebUSB for zero-install (Chrome only).
   - Good as a "getting started" option before merchants invest in CloudPRNT hardware.

4. **Direct LAN printing: Raw TCP/IP**
   - If you build a small local agent (Electron app or similar) that runs at the merchant.
   - Most flexible and cheapest, but requires a local agent or always-on server.

---

## PART 4: Key Takeaways

1. **Most major restaurant platforms (Toast, Square, Clover, TouchBistro, Revel, Lightspeed)** use LAN-based printing from their proprietary POS to certified thermal printers. They do NOT use cloud printing for KOT -- it's all local network for speed and reliability.

2. **Delivery aggregators (DoorDash, Uber Eats, Grubhub, ChowNow)** use tablet apps with Bluetooth/USB printer connections. Auto-print is a feature of their Android/iOS apps, not a cloud printing solution.

3. **Order aggregators (Otter, Cuboh)** use their own tablet/hub hardware that polls their cloud for orders and prints locally. This is the closest model to what a multi-tenant web platform would need.

4. **Star CloudPRNT is the only major zero-install cloud-to-printer solution** where the printer itself handles the cloud connection. This is increasingly the industry standard for web-based ordering platforms.

5. **PrintNode is the most flexible cloud printing API** for supporting any printer brand, at the cost of requiring a client install.

6. **QZ Tray is the most popular open-source browser-to-printer bridge** and is widely used in web-based POS systems.

7. **Raw TCP/IP on port 9100** is the simplest and most universal approach for same-network printing but cannot work across the internet without tunneling.

8. **WebUSB is promising but limited** -- Chrome/Edge only, USB only, requires browser to stay open. Good for simple setups.

9. **Google Cloud Print is dead.** PrintHero appears dead. ExpressPrint not found.

10. **The industry is moving toward KDS (Kitchen Display Systems)** over paper tickets, but thermal printers remain dominant in most restaurants, especially for delivery/takeout orders.
