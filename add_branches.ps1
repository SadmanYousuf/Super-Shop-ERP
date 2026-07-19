$path='E:\ERP SUPER SHOP\index.html'
$c=Get-Content $path -Raw
$branch='

<!-- VIEW: BRANCHES -->
<section id="view-branches" class="content-view">
<header class="view-header"><h1>Multi-Branch Management</h1><p>Manage store locations.</p></header>
<div class="glass-card">
<h3>Add New Branch</h3>
<form id="branch-form" onsubmit="createBranch(event)">
<div class="form-row"><div class="form-group flex-1"><label>Branch Name</label><input id="branch-name" placeholder="Downtown Store" required></div>
<div class="form-group flex-1"><label>Branch Code</label><input id="branch-code" placeholder="DTN01" required></div></div>
<button type="submit" class="submit-btn">Add Branch</button>
</form></div>
<div class="glass-card" style="margin-top:1rem;"><h3>All Branches</h3>
<table id="tbl-branches"><thead><tr><th>Code</th><th>Name</th><th>Created</th></tr></thead>
<tbody><tr class="empty-state"><td colspan="3">No branches yet.</td></tr></tbody></table></div>
</section>
'
$c = $c.Replace('</main>', $branch+'</main>')
Set-Content -Path $path -Value $c -NoNewline
Write-Output 'Branches added'