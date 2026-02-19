# Open HTML file in default browser with correct file:// protocol
$htmlPath = "D:\benchmark_ui\reports\survey_builder_analytics.html"
$fileUrl = "file:///$($htmlPath -replace '\\', '/')"
Start-Process $fileUrl

