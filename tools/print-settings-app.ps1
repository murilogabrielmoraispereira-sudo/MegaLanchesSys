Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$settingsPath = Join-Path $root "data\print-settings.json"

function Read-Settings {
  if (-not (Test-Path $settingsPath)) {
    return @{}
  }
  try {
    $raw = Get-Content $settingsPath -Raw -ErrorAction Stop
    $data = $raw | ConvertFrom-Json
    if ($null -eq $data) { return @{} }
    return $data
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Falha ao ler configuracoes. O arquivo sera recriado.", "Impressora")
    return @{}
  }
}

function Save-Settings([hashtable]$data) {
  $dir = Split-Path -Parent $settingsPath
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
  $json = $data | ConvertTo-Json -Depth 4
  $json | Set-Content -Path $settingsPath -Encoding UTF8
}

$settings = Read-Settings
$pidPath = Join-Path $root "data\print-agent.pid"

$form = New-Object System.Windows.Forms.Form
$form.Text = "Mega Lanches - Impressora (v2)"
$form.Size = New-Object System.Drawing.Size(900, 680)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "Sizable"
$form.MaximizeBox = $true
$form.MinimumSize = New-Object System.Drawing.Size(900, 680)
$form.WindowState = "Maximized"
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 18)
$form.ForeColor = [System.Drawing.Color]::White
$form.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)

$accent = [System.Drawing.Color]::FromArgb(255, 170, 0)
$accentDark = [System.Drawing.Color]::FromArgb(190, 120, 0)
$cardBg = [System.Drawing.Color]::FromArgb(26, 26, 26)
$muted = [System.Drawing.Color]::FromArgb(180, 180, 180)
$panel = New-Object System.Windows.Forms.Panel
$panel.Dock = "Top"
$panel.Height = 96
$panel.BackColor = [System.Drawing.Color]::FromArgb(24, 24, 24)
$panel.Anchor = "Top,Left,Right"
$form.Controls.Add($panel)

$title = New-Object System.Windows.Forms.Label
$title.Text = "Central de Impressao"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$title.ForeColor = $accent
$title.Location = New-Object System.Drawing.Point(24, 18)
$title.Size = New-Object System.Drawing.Size(500, 40)
$panel.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Escolha a impressora, ajuste largura, margens e corte"
$subtitle.Font = New-Object System.Drawing.Font("Segoe UI", 10, [System.Drawing.FontStyle]::Regular)
$subtitle.ForeColor = $muted
$subtitle.Location = New-Object System.Drawing.Point(26, 54)
$subtitle.Size = New-Object System.Drawing.Size(600, 20)
$panel.Controls.Add($subtitle)

function Add-Label($text, $x, $y) {
  $lbl = New-Object System.Windows.Forms.Label
  $lbl.Text = $text
  $lbl.Location = New-Object System.Drawing.Point($x, $y)
  $lbl.Size = New-Object System.Drawing.Size(240, 22)
  $lbl.ForeColor = $muted
  $form.Controls.Add($lbl)
}

function Add-TextBox($x, $y, $width) {
  $tb = New-Object System.Windows.Forms.TextBox
  $tb.Location = New-Object System.Drawing.Point($x, $y)
  $tb.Size = New-Object System.Drawing.Size($width, 26)
  $tb.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
  $tb.ForeColor = [System.Drawing.Color]::White
  $tb.BorderStyle = "FixedSingle"
  $form.Controls.Add($tb)
  return $tb
}

function Add-Numeric($x, $y, $min, $max) {
  $num = New-Object System.Windows.Forms.NumericUpDown
  $num.Location = New-Object System.Drawing.Point($x, $y)
  $num.Size = New-Object System.Drawing.Size(120, 26)
  $num.Minimum = $min
  $num.Maximum = $max
  $num.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
  $num.ForeColor = [System.Drawing.Color]::White
  $num.BorderStyle = "FixedSingle"
  $form.Controls.Add($num)
  return $num
}

function Add-Combo($x, $y, $items) {
  $combo = New-Object System.Windows.Forms.ComboBox
  $combo.Location = New-Object System.Drawing.Point($x, $y)
  $combo.Size = New-Object System.Drawing.Size(220, 26)
  $combo.DropDownStyle = "DropDownList"
  $combo.Items.AddRange($items)
  $combo.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)
  $combo.ForeColor = [System.Drawing.Color]::White
  $form.Controls.Add($combo)
  return $combo
}

Add-Label "Impressoras conectadas:" 24 120
$printerList = Add-Combo 24 144 @()
$printerList.Anchor = "Top,Left"

$btnRefresh = New-Object System.Windows.Forms.Button
$btnRefresh.Text = "Atualizar"
$btnRefresh.Location = New-Object System.Drawing.Point(260, 142)
$btnRefresh.Size = New-Object System.Drawing.Size(100, 28)
$btnRefresh.BackColor = [System.Drawing.Color]::FromArgb(35, 35, 35)
$btnRefresh.ForeColor = [System.Drawing.Color]::White
$btnRefresh.FlatStyle = "Flat"
$btnRefresh.Anchor = "Top,Left"
$form.Controls.Add($btnRefresh)

Add-Label "Nome da impressora (opcional):" 380 120
$printerName = Add-TextBox 380 144 380
$printerName.Anchor = "Top,Left,Right"

$cardA = New-Object System.Windows.Forms.GroupBox
$cardA.Text = "Formato"
$cardA.Location = New-Object System.Drawing.Point(24, 200)
$cardA.Size = New-Object System.Drawing.Size(360, 250)
$cardA.ForeColor = $muted
$cardA.BackColor = $cardBg
$cardA.Anchor = "Top,Left"
$form.Controls.Add($cardA)

Add-Label "Largura (colunas):" 44 236
$maxCols = Add-Numeric 44 260 16 64

Add-Label "Margem esquerda (colunas):" 44 304
$marginLeft = Add-Numeric 44 328 0 20

Add-Label "Margem topo (linhas):" 220 304
$marginTop = Add-Numeric 220 328 0 10

Add-Label "Margem base (linhas):" 220 372
$marginBottom = Add-Numeric 220 396 0 10

$cardB = New-Object System.Windows.Forms.GroupBox
$cardB.Text = "Corte & Windows"
$cardB.Location = New-Object System.Drawing.Point(410, 200)
$cardB.Size = New-Object System.Drawing.Size(350, 250)
$cardB.ForeColor = $muted
$cardB.BackColor = $cardBg
$cardB.Anchor = "Top,Left"
$form.Controls.Add($cardB)

Add-Label "Modo de corte:" 424 236
$cutMode = Add-Combo 424 260 @("full", "partial", "none")

Add-Label "Modo Windows:" 424 304
$windowsMode = Add-Combo 424 328 @("notepad", "raw", "out-printer")

Add-Label "RAW escala X:" 424 372
$rawScaleX = Add-Numeric 424 396 1 8

Add-Label "RAW escala Y:" 560 372
$rawScaleY = Add-Numeric 560 396 1 8

$rawBold = New-Object System.Windows.Forms.CheckBox
$rawBold.Text = "RAW negrito"
$rawBold.Location = New-Object System.Drawing.Point(560, 398)
$rawBold.Size = New-Object System.Drawing.Size(120, 24)
$rawBold.ForeColor = $muted
$form.Controls.Add($rawBold)

$btnSave = New-Object System.Windows.Forms.Button
$btnSave.Text = "Salvar"
$btnSave.Location = New-Object System.Drawing.Point(24, 490)
$btnSave.Size = New-Object System.Drawing.Size(180, 42)
$btnSave.BackColor = $accent
$btnSave.ForeColor = [System.Drawing.Color]::Black
$btnSave.FlatStyle = "Flat"
$btnSave.Anchor = "Bottom,Left"
$form.Controls.Add($btnSave)

$btnTest = New-Object System.Windows.Forms.Button
$btnTest.Text = "Testar impressao"
$btnTest.Location = New-Object System.Drawing.Point(220, 490)
$btnTest.Size = New-Object System.Drawing.Size(240, 42)
$btnTest.BackColor = [System.Drawing.Color]::FromArgb(45, 45, 45)
$btnTest.ForeColor = [System.Drawing.Color]::White
$btnTest.FlatStyle = "Flat"
$btnTest.Anchor = "Bottom,Left"
$form.Controls.Add($btnTest)

$btnClose = New-Object System.Windows.Forms.Button
$btnClose.Text = "Fechar"
$btnClose.Location = New-Object System.Drawing.Point(480, 490)
$btnClose.Size = New-Object System.Drawing.Size(140, 42)
$btnClose.BackColor = [System.Drawing.Color]::FromArgb(35, 35, 35)
$btnClose.ForeColor = [System.Drawing.Color]::White
$btnClose.FlatStyle = "Flat"
$btnClose.Anchor = "Bottom,Right"
$form.Controls.Add($btnClose)

$status = New-Object System.Windows.Forms.Label
$status.Text = ""
$status.Location = New-Object System.Drawing.Point(24, 540)
$status.Size = New-Object System.Drawing.Size(760, 24)
$status.ForeColor = $muted
$status.Anchor = "Bottom,Left"
$form.Controls.Add($status)

$btnStart = New-Object System.Windows.Forms.Button
$btnStart.Text = "Iniciar agente"
$btnStart.Location = New-Object System.Drawing.Point(640, 490)
$btnStart.Size = New-Object System.Drawing.Size(160, 42)
$btnStart.BackColor = $accentDark
$btnStart.ForeColor = [System.Drawing.Color]::White
$btnStart.FlatStyle = "Flat"
$btnStart.FlatAppearance.BorderSize = 1
$btnStart.FlatAppearance.BorderColor = $accent
$btnStart.Anchor = "Bottom,Right"
$form.Controls.Add($btnStart)

$btnStop = New-Object System.Windows.Forms.Button
$btnStop.Text = "Parar agente"
$btnStop.Location = New-Object System.Drawing.Point(640, 540)
$btnStop.Size = New-Object System.Drawing.Size(160, 42)
$btnStop.BackColor = [System.Drawing.Color]::FromArgb(80, 30, 30)
$btnStop.ForeColor = [System.Drawing.Color]::White
$btnStop.FlatStyle = "Flat"
$btnStop.FlatAppearance.BorderSize = 1
$btnStop.FlatAppearance.BorderColor = $accent
$btnStop.Anchor = "Bottom,Right"
$form.Controls.Add($btnStop)

function Apply-Defaults {
  $printerName.Text = $settings.printerName
  if (-not $printerName.Text -and $settings.printInterface) {
    $printerName.Text = $settings.printInterface -replace "^printer:", ""
  }
  $maxCols.Value = if ($settings.maxCols) { [int]$settings.maxCols } else { 42 }
  $marginLeft.Value = if ($settings.marginLeft -ne $null) { [int]$settings.marginLeft } else { 0 }
  $marginTop.Value = if ($settings.marginTop -ne $null) { [int]$settings.marginTop } else { 0 }
  $marginBottom.Value = if ($settings.marginBottom -ne $null) { [int]$settings.marginBottom } else { 0 }
  $cutMode.SelectedItem = if ($settings.cutMode) { $settings.cutMode } else { "full" }
  if (-not $cutMode.SelectedItem) { $cutMode.SelectedIndex = 0 }
  $windowsMode.SelectedItem = if ($settings.windowsMode) { $settings.windowsMode } else { "notepad" }
  if (-not $windowsMode.SelectedItem) { $windowsMode.SelectedIndex = 0 }
  $rawScaleX.Value = if ($settings.rawScaleX) { [int]$settings.rawScaleX } else { 1 }
  $rawScaleY.Value = if ($settings.rawScaleY) { [int]$settings.rawScaleY } else { 1 }
  $rawBold.Checked = ($settings.rawBold -eq 1 -or $settings.rawBold -eq "1" -or $settings.rawBold -eq $true)
}

function Load-Printers {
  $printerList.Items.Clear()
  try {
    $names = @()
    if (Get-Command Get-Printer -ErrorAction SilentlyContinue) {
      $names = Get-Printer | Sort-Object Name | Select-Object -ExpandProperty Name
    } else {
      $names = Get-WmiObject -Class Win32_Printer | Sort-Object Name | Select-Object -ExpandProperty Name
    }
    foreach ($name in $names) {
      [void]$printerList.Items.Add($name)
    }
    if ($names.Count -gt 0) {
      $status.Text = "Impressoras carregadas: $($names.Count)"
    } else {
      $status.Text = "Nenhuma impressora encontrada."
    }
  } catch {
    $status.Text = "Erro ao listar impressoras."
  }
}

Apply-Defaults
Load-Printers

function Get-AgentPid {
  if (-not (Test-Path $pidPath)) { return $null }
  try {
    $agentPid = Get-Content $pidPath -Raw | ForEach-Object { $_.Trim() }
    if (-not $agentPid) { return $null }
    return [int]$agentPid
  } catch {
    return $null
  }
}

function Is-AgentRunning {
  $agentPid = Get-AgentPid
  if (-not $agentPid) { return $false }
  try {
    $p = Get-Process -Id $agentPid -ErrorAction Stop
    return $true
  } catch {
    return $false
  }
}

function Start-Agent {
  if (Is-AgentRunning) {
    $status.Text = "Agente ja esta rodando."
    return
  }
  $status.Text = "Iniciando agente..."
  Stop-AgentByScan
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    $status.Text = "Node.js nao encontrado no PATH."
    [System.Windows.Forms.MessageBox]::Show("Node.js nao encontrado. Instale o Node ou abra o app pelo ambiente correto.", "Impressora")
    return
  }
  $data = @{
    printerName = $printerName.Text
    maxCols = [int]$maxCols.Value
    marginLeft = [int]$marginLeft.Value
    marginTop = [int]$marginTop.Value
    marginBottom = [int]$marginBottom.Value
    cutMode = $cutMode.SelectedItem
    windowsMode = $windowsMode.SelectedItem
    rawScaleX = [int]$rawScaleX.Value
    rawScaleY = [int]$rawScaleY.Value
    rawBold = if ($rawBold.Checked) { 1 } else { 0 }
  }
  Save-Settings $data
  $selectedPrinter = $null
  if ($printerList.SelectedItem) {
    $selectedPrinter = [string]$printerList.SelectedItem
  }
  if ($selectedPrinter) {
    $data.printerName = $selectedPrinter
    $printerName.Text = $selectedPrinter
  }
  $node = "node"
  $scriptPath = Join-Path $root "scripts\print-agent.js"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $node
  $psi.Arguments = "`"$scriptPath`""
  $psi.WorkingDirectory = $root
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.WindowStyle = "Hidden"
  $envs = $psi.EnvironmentVariables
  if ($data.printerName) {
    $envs["PRINT_INTERFACE"] = "printer:$($data.printerName)"
  }
  $envs["PRINT_MAX_COLS"] = [string]$data.maxCols
  $envs["PRINT_MARGIN_LEFT"] = [string]$data.marginLeft
  $envs["PRINT_MARGIN_TOP"] = [string]$data.marginTop
  $envs["PRINT_MARGIN_BOTTOM"] = [string]$data.marginBottom
  $envs["PRINT_CUT_MODE"] = [string]$data.cutMode
  $envs["PRINT_WINDOWS_MODE"] = [string]$data.windowsMode
  $envs["PRINT_RAW_SCALE_X"] = [string]$data.rawScaleX
  $envs["PRINT_RAW_SCALE_Y"] = [string]$data.rawScaleY
  $envs["PRINT_RAW_BOLD"] = [string]$data.rawBold
  try {
    $proc = [System.Diagnostics.Process]::Start($psi)
    if ($proc) {
      $proc.Id | Set-Content -Path $pidPath -Encoding ASCII
      if ($data.printerName) {
        $status.Text = "Agente iniciado (PID $($proc.Id)) na impressora $($data.printerName)."
      } else {
        $status.Text = "Agente iniciado (PID $($proc.Id))."
      }
    } else {
      $status.Text = "Falha ao iniciar agente."
    }
  } catch {
    $msg = $_.Exception.Message
    $status.Text = "Erro ao iniciar agente: $msg"
    [System.Windows.Forms.MessageBox]::Show("Erro ao iniciar agente:`n$msg", "Impressora")
  }
}

function Stop-AgentByScan {
  try {
    $processes = Get-CimInstance Win32_Process | Where-Object {
      $_.CommandLine -and $_.CommandLine -match "print-agent.js" -and $_.Name -match "node"
    }
    foreach ($p in $processes) {
      try { Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
    }
  } catch {
  }
}

function Stop-Agent {
  $status.Text = "Parando agente..."
  $agentPid = Get-AgentPid
  if (-not $agentPid) {
    Stop-AgentByScan
    $status.Text = "Agente parado."
    return
  }
  try {
    Stop-Process -Id $agentPid -Force -ErrorAction SilentlyContinue
    Remove-Item $pidPath -ErrorAction SilentlyContinue
    Stop-AgentByScan
    $status.Text = "Agente parado."
  } catch {
    Stop-AgentByScan
    $msg = $_.Exception.Message
    $status.Text = "Falha ao parar agente: $msg"
    [System.Windows.Forms.MessageBox]::Show("Falha ao parar agente:`n$msg", "Impressora")
  }
}

$btnSave.Add_Click({
  $data = @{
    printerName = $printerName.Text
    maxCols = [int]$maxCols.Value
    marginLeft = [int]$marginLeft.Value
    marginTop = [int]$marginTop.Value
    marginBottom = [int]$marginBottom.Value
    cutMode = $cutMode.SelectedItem
    windowsMode = $windowsMode.SelectedItem
    rawScaleX = [int]$rawScaleX.Value
    rawScaleY = [int]$rawScaleY.Value
    rawBold = if ($rawBold.Checked) { 1 } else { 0 }
  }
  Save-Settings $data
  [System.Windows.Forms.MessageBox]::Show("Configuracoes salvas.", "Impressora")
})

$btnTest.Add_Click({
  $data = @{
    printerName = $printerName.Text
    maxCols = [int]$maxCols.Value
    marginLeft = [int]$marginLeft.Value
    marginTop = [int]$marginTop.Value
    marginBottom = [int]$marginBottom.Value
    cutMode = $cutMode.SelectedItem
    windowsMode = $windowsMode.SelectedItem
    rawScaleX = [int]$rawScaleX.Value
    rawScaleY = [int]$rawScaleY.Value
    rawBold = if ($rawBold.Checked) { 1 } else { 0 }
  }
  Save-Settings $data
  $node = "node"
  $scriptPath = Join-Path $root "scripts\print-agent.js"
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $node
  $psi.Arguments = "`"$scriptPath`" --test"
  $psi.WorkingDirectory = $root
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.WindowStyle = "Hidden"
  $envs = $psi.EnvironmentVariables
  if ($data.printerName) {
    $envs["PRINT_INTERFACE"] = "printer:$($data.printerName)"
  }
  $envs["PRINT_MAX_COLS"] = [string]$data.maxCols
  $envs["PRINT_MARGIN_LEFT"] = [string]$data.marginLeft
  $envs["PRINT_MARGIN_TOP"] = [string]$data.marginTop
  $envs["PRINT_MARGIN_BOTTOM"] = [string]$data.marginBottom
  $envs["PRINT_CUT_MODE"] = [string]$data.cutMode
  $envs["PRINT_WINDOWS_MODE"] = [string]$data.windowsMode
  $envs["PRINT_RAW_SCALE_X"] = [string]$data.rawScaleX
  $envs["PRINT_RAW_SCALE_Y"] = [string]$data.rawScaleY
  $envs["PRINT_RAW_BOLD"] = [string]$data.rawBold
  [System.Diagnostics.Process]::Start($psi) | Out-Null
})

$btnRefresh.Add_Click({ Load-Printers })

$printerList.Add_SelectedIndexChanged({
  if ($printerList.SelectedItem) {
    $printerName.Text = [string]$printerList.SelectedItem
  }
})

$btnStart.Add_Click({
  try { Start-Agent } catch { $status.Text = "Erro ao iniciar agente."; [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Impressora") }
})
$btnStop.Add_Click({
  try { Stop-Agent } catch { $status.Text = "Erro ao parar agente."; [System.Windows.Forms.MessageBox]::Show($_.Exception.Message, "Impressora") }
})

$btnClose.Add_Click({ $form.Close() })

$form.Add_Shown({ $form.Activate() })
[void]$form.ShowDialog()
