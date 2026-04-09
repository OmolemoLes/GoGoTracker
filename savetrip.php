<?php
include 'db.php';

$data = file_get_contents("php://input");

$stmt = $conn->prepare("INSERT INTO trips (data) VALUES (?)");
$stmt->bind_param("s", $data);

if ($stmt->execute()) {
  echo "Saved";
} else {
  echo "Error";
}

$stmt->close();
$conn->close();
?>