def test_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_unknown_route_uses_error_shape(client):
    response = client.get("/api/v1/does-not-exist")
    assert response.status_code == 404
    assert response.json() == {"message": "Not Found"}
