import AppKit
import Foundation

struct SlideSpec {
    let fileName: String
    let title: String
    let subtitle: String?
}

struct PlatformSpec {
    let name: String
    let inputDir: URL
    let outputDir: URL
    let size: CGSize
    let screenshotWidthRatio: CGFloat
    let screenshotBottomMarginRatio: CGFloat
    let titleTopRatio: CGFloat
    let titleFontRatio: CGFloat
    let subtitleFontRatio: CGFloat
    let headerFontRatio: CGFloat
}

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
let screenshotRoot = root.appendingPathComponent("screenshot", isDirectory: true)
let outputRoot = screenshotRoot.appendingPathComponent("appstore-c1", isDirectory: true)

let slides: [SlideSpec] = [
    .init(fileName: "IMG_1563.png", title: "发现同频分享", subtitle: nil),
    .init(fileName: "IMG_1564.png", title: "把日常发出来", subtitle: nil),
    .init(fileName: "IMG_1565.png", title: "把喜欢聊深一点", subtitle: nil),
    .init(fileName: "IMG_1566.png", title: "找到你的生活圈", subtitle: nil),
    .init(fileName: "IMG_1567.png", title: "整理你的表达主页", subtitle: nil),
]

let platforms: [PlatformSpec] = [
    .init(
        name: "iphone",
        inputDir: screenshotRoot,
        outputDir: outputRoot.appendingPathComponent("iphone", isDirectory: true),
        size: CGSize(width: 1284, height: 2778),
        screenshotWidthRatio: 0.70,
        screenshotBottomMarginRatio: 0.06,
        titleTopRatio: 0.18,
        titleFontRatio: 0.044,
        subtitleFontRatio: 0.018,
        headerFontRatio: 0.018
    ),
    .init(
        name: "ipad",
        inputDir: screenshotRoot.appendingPathComponent("ipad", isDirectory: true),
        outputDir: outputRoot.appendingPathComponent("ipad", isDirectory: true),
        size: CGSize(width: 2048, height: 2732),
        screenshotWidthRatio: 0.52,
        screenshotBottomMarginRatio: 0.05,
        titleTopRatio: 0.19,
        titleFontRatio: 0.038,
        subtitleFontRatio: 0.016,
        headerFontRatio: 0.014
    ),
]

func makeParagraph(alignment: NSTextAlignment, lineSpacing: CGFloat = 0) -> NSMutableParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.alignment = alignment
    style.lineSpacing = lineSpacing
    return style
}

func roundedImageRect(canvas: CGSize, image: NSImage, targetWidth: CGFloat, bottomMargin: CGFloat) -> CGRect {
    let aspect = image.size.height / image.size.width
    let height = targetWidth * aspect
    let x = (canvas.width - targetWidth) / 2
    let y = bottomMargin
    return CGRect(x: x, y: y, width: targetWidth, height: height)
}

func color(_ r: CGFloat, _ g: CGFloat, _ b: CGFloat, _ a: CGFloat = 1.0) -> NSColor {
    NSColor(calibratedRed: r / 255, green: g / 255, blue: b / 255, alpha: a)
}

func drawBackground(in canvas: CGRect) {
    let gradient = NSGradient(colors: [
        color(23, 50, 75),
        color(38, 84, 128),
        color(242, 221, 200),
    ])!
    gradient.draw(in: canvas, angle: -90)

    let glowPath = NSBezierPath(ovalIn: CGRect(
        x: canvas.width * 0.22,
        y: canvas.height * 0.68,
        width: canvas.width * 0.56,
        height: canvas.width * 0.56
    ))
    color(255, 255, 255, 0.16).setFill()
    glowPath.fill()

    let topSpark = NSBezierPath(ovalIn: CGRect(
        x: canvas.width * 0.08,
        y: canvas.height * 0.84,
        width: canvas.width * 0.20,
        height: canvas.width * 0.20
    ))
    color(255, 255, 255, 0.10).setFill()
    topSpark.fill()
}

func drawHeader(platform: PlatformSpec, in canvas: CGRect) {
    let fontSize = canvas.height * platform.headerFontRatio
    let header = NSAttributedString(string: "虾说", attributes: [
        .font: NSFont.systemFont(ofSize: fontSize, weight: .medium),
        .foregroundColor: color(244, 247, 250, 0.82),
        .paragraphStyle: makeParagraph(alignment: .center)
    ])
    let pillRect = CGRect(x: canvas.width * 0.42, y: canvas.height * 0.91, width: canvas.width * 0.16, height: fontSize * 2.0)
    color(255, 255, 255, 0.10).setFill()
    NSBezierPath(roundedRect: pillRect, xRadius: pillRect.height / 2, yRadius: pillRect.height / 2).fill()
    let rect = CGRect(x: canvas.width * 0.30, y: canvas.height * 0.914, width: canvas.width * 0.40, height: fontSize * 1.4)
    header.draw(in: rect)
}

func drawTitle(_ slide: SlideSpec, platform: PlatformSpec, in canvas: CGRect) {
    let titleFontSize = canvas.height * platform.titleFontRatio
    let subtitleFontSize = canvas.height * platform.subtitleFontRatio

    let titleAttributes: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: titleFontSize, weight: .semibold),
        .foregroundColor: color(255, 248, 241),
        .paragraphStyle: makeParagraph(alignment: .center, lineSpacing: titleFontSize * 0.08)
    ]

    let titleString = NSAttributedString(string: slide.title, attributes: titleAttributes)

    let textWidth = canvas.width * 0.78
    let titleHeight = titleFontSize * 1.8
    let titleY = canvas.height - (canvas.height * platform.titleTopRatio) - titleHeight
    let titleRect = CGRect(x: (canvas.width - textWidth) / 2, y: titleY, width: textWidth, height: titleHeight)

    titleString.draw(in: titleRect)
    if let subtitle = slide.subtitle, !subtitle.isEmpty {
        let subtitleAttributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: subtitleFontSize, weight: .regular),
            .foregroundColor: color(244, 247, 250, 0.86),
            .paragraphStyle: makeParagraph(alignment: .center, lineSpacing: subtitleFontSize * 0.45)
        ]
        let subtitleString = NSAttributedString(string: subtitle, attributes: subtitleAttributes)
        let subtitleHeight = subtitleFontSize * 4.0
        let subtitleY = titleY - subtitleHeight - (subtitleFontSize * 0.95)
        let subtitleRect = CGRect(x: (canvas.width - textWidth) / 2, y: subtitleY, width: textWidth, height: subtitleHeight)
        subtitleString.draw(in: subtitleRect)
    }
}

func drawScreenshot(_ image: NSImage, rect: CGRect) {
    let shadow = NSShadow()
    shadow.shadowColor = color(9, 21, 35, 0.24)
    shadow.shadowBlurRadius = rect.width * 0.045
    shadow.shadowOffset = CGSize(width: 0, height: -rect.width * 0.018)

    NSGraphicsContext.saveGraphicsState()
    shadow.set()
    color(255, 255, 255, 0.18).setFill()
    let outerRect = rect.insetBy(dx: -rect.width * 0.02, dy: -rect.width * 0.02)
    NSBezierPath(roundedRect: outerRect, xRadius: rect.width * 0.08, yRadius: rect.width * 0.08).fill()
    NSGraphicsContext.restoreGraphicsState()

    NSGraphicsContext.saveGraphicsState()
    let clip = NSBezierPath(roundedRect: rect, xRadius: rect.width * 0.08, yRadius: rect.width * 0.08)
    clip.addClip()
    image.draw(in: rect, from: .zero, operation: .sourceOver, fraction: 1.0)
    NSGraphicsContext.restoreGraphicsState()
}

func render(slide: SlideSpec, platform: PlatformSpec) throws {
    let inputURL = platform.inputDir.appendingPathComponent(slide.fileName)
    guard let image = NSImage(contentsOf: inputURL) else {
        throw NSError(domain: "generate", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to load \(inputURL.path)"])
    }

    let canvasSize = platform.size
    let canvasRect = CGRect(origin: .zero, size: canvasSize)
    let screenshotRect = roundedImageRect(
        canvas: canvasSize,
        image: image,
        targetWidth: canvasSize.width * platform.screenshotWidthRatio,
        bottomMargin: canvasSize.height * platform.screenshotBottomMarginRatio
    )

    let final = NSImage(size: canvasSize, flipped: false) { _ in
        drawBackground(in: canvasRect)
        drawHeader(platform: platform, in: canvasRect)
        drawTitle(slide, platform: platform, in: canvasRect)
        drawScreenshot(image, rect: screenshotRect)
        return true
    }

    guard
        let tiff = final.tiffRepresentation,
        let bitmap = NSBitmapImageRep(data: tiff),
        let pngData = bitmap.representation(using: .png, properties: [:])
    else {
        throw NSError(domain: "generate", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to encode PNG for \(slide.fileName)"])
    }

    try FileManager.default.createDirectory(at: platform.outputDir, withIntermediateDirectories: true)
    try pngData.write(to: platform.outputDir.appendingPathComponent(slide.fileName))
}

do {
    for platform in platforms {
        for slide in slides {
            try render(slide: slide, platform: platform)
        }
    }
    print("Generated App Store screenshots in \(outputRoot.path)")
} catch {
    fputs("Error: \(error.localizedDescription)\n", stderr)
    exit(1)
}
